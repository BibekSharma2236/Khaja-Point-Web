import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { getSocket } from '../socket';
import 'leaflet/dist/leaflet.css';

const STATUSES = [
  'PLACED',
  'PAYMENT_SUCCESS',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
];

function statusIndex(s) {
  const i = STATUSES.indexOf(s);
  return i === -1 ? 0 : i;
}

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

const courierIcon = L.divIcon({
  html: '<div class="courierPulse" title="Courier Driver"></div>',
  className: 'mapMarkerWrapper',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const restaurantIcon = L.divIcon({
  html: '<div style="background:#ff5500; color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; border:2px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.5);">🍳</div>',
  className: 'mapMarkerWrapper',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export default function TrackOrder({ orderId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [courierLocation, setCourierLocation] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const simIntervalRef = useRef(null);
  const socketRef = useRef(null);

  const activeStatus = liveStatus || tracking?.order?.status || null;

  const fallbackLocation = useMemo(() => {
    if (courierLocation) return courierLocation;
    if (tracking?.courier_location) return tracking.courier_location;
    return { lat: 27.7172, lng: 85.324 }; // Kathmandu Valley center
  }, [courierLocation, tracking]);

  useEffect(() => {
    if (!orderId) return;
    let alive = true;

    async function loadTracking() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getOrderTracking(orderId);
        if (!alive) return;
        setTracking(data);
        setLiveStatus(data.order.status);
        setCourierLocation(data.courier_location || { lat: 27.7172, lng: 85.324 });
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load live tracking');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadTracking();
    return () => {
      alive = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();
    socketRef.current = socket;
    socket.emit('order:join', { orderId });

    const handleOrderUpdated = (payload) => {
      if (payload?.orderId !== orderId) return;
      if (payload?.status) setLiveStatus(payload.status);
    };

    const handleCourierLocation = (payload) => {
      if (payload?.orderId !== orderId) return;
      if (!payload?.courier_location) return;
      setCourierLocation(payload.courier_location);
    };

    socket.on('order:updated', handleOrderUpdated);
    socket.on('courier:location', handleCourierLocation);

    return () => {
      socket.off('order:updated', handleOrderUpdated);
      socket.off('courier:location', handleCourierLocation);
      socket.emit('order:leave', { orderId });
    };
  }, [orderId]);

  // Live GPS movement simulator
  function startGpsSimulation() {
    if (simulating) {
      clearInterval(simIntervalRef.current);
      setSimulating(false);
      return;
    }

    setSimulating(true);
    setLiveStatus('OUT_FOR_DELIVERY');

    let step = 0;
    const startLat = 27.7172;
    const startLng = 85.324;
    const destLat = 27.7115;
    const destLng = 85.3185;

    simIntervalRef.current = setInterval(() => {
      step += 1;
      const progress = step / 15;

      const nextLat = startLat + (destLat - startLat) * Math.min(1, progress);
      const nextLng = startLng + (destLng - startLng) * Math.min(1, progress);

      setCourierLocation({ lat: nextLat, lng: nextLng });

      if (progress >= 1) {
        clearInterval(simIntervalRef.current);
        setSimulating(false);
        setLiveStatus('DELIVERED');
      }
    }, 1500);
  }

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const mapCenter = useMemo(() => [fallbackLocation.lat, fallbackLocation.lng], [fallbackLocation]);
  const restaurantLocation = useMemo(() => [27.7172, 85.324], []);

  const statusTimeline = useMemo(() => {
    const s = activeStatus || 'PLACED';
    const idx = statusIndex(s);
    return STATUSES.map((st) => ({ st, done: statusIndex(st) <= idx }));
  }, [activeStatus]);

  if (!orderId) {
    return (
      <div className="page">
        <div className="card emptyState">No order selected for tracking. Please select an order from the Orders tab.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Live Order Telemetry</h2>
          <div className="muted">Real-time socket location feed & courier tracking</div>
        </div>
        <div className="pill" style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>Order #{orderId}</div>
      </div>

      {loading ? <div className="card muted">Connecting to driver GPS broadcast...</div> : null}
      {error ? <div className="card error">{error}</div> : null}

      {!loading && !error && tracking ? (
        <div className="trackGrid">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Dispatch & Courier Route</div>
                <div className="mutedSmall">Status: <strong style={{ color: 'var(--brand-primary)' }}>{activeStatus || 'PLACED'}</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mutedSmall">Est. Arrival</div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-green)' }}>
                  {activeStatus === 'DELIVERED' ? 'Delivered 🎉' : `${tracking.eta_minutes || 18} mins`}
                </div>
              </div>
            </div>

            <div className="trackMap">
              <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={false} className="realMap">
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline positions={[restaurantLocation, mapCenter]} pathOptions={{ color: '#ff6b00', weight: 4, opacity: 0.95, dashArray: '6 6' }} />
                <Marker position={restaurantLocation} icon={restaurantIcon}>
                  <Tooltip permanent direction="top">Kitchen Spot</Tooltip>
                </Marker>
                <Marker position={mapCenter} icon={courierIcon}>
                  <Tooltip permanent direction="top">Courier Driver</Tooltip>
                </Marker>
              </MapContainer>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Delivery Contact</div>
                <div className="mutedSmall">{tracking.order.delivery_name} • {tracking.order.delivery_phone}</div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className={simulating ? 'btn btnDanger' : 'btn btnPrimary'}
                  style={{ padding: '8px 14px', fontSize: '0.85rem', width: 'auto' }}
                  onClick={startGpsSimulation}
                >
                  {simulating ? '⏸ Stop Simulation' : '▶ Simulate Driver Drive'}
                </button>
                <button
                  className="btn btnGhost"
                  style={{ padding: '8px 14px', fontSize: '0.85rem', width: 'auto' }}
                  onClick={() => alert(`Calling courier driver at ${tracking.order.delivery_phone}...`)}
                >
                  📞 Call Driver
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: 14 }}>Status Timeline</h3>
            <div className="timeline">
              {statusTimeline.map(({ st, done }) => (
                <div key={st} className={done ? 'step stepDone' : 'step'}>
                  <div className="stepDot" />
                  <div className="stepLabel">{st.replaceAll('_', ' ')}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-glass)' }}>
              <div className="totRow">
                <span>Order Total</span>
                <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>{formatINR(tracking.order.total_cents)}</span>
              </div>
              <div className="miniNotice" style={{ marginTop: 12 }}>
                ⚡ <strong>Sockets Telemetry:</strong> Position coordinates stream automatically in real-time as the driver navigates.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
