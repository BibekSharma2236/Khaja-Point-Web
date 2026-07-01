import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { getSocket } from '../socket';
import 'leaflet/dist/leaflet.css';

const STATUSES = [
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'ASSIGNED',
  'PICKING_UP',
  'ON_THE_WAY',
  'ARRIVED',
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function latLngToXY(lat, lng, bounds) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const x = (lng - minLng) / (maxLng - minLng || 1);
  const y = 1 - (lat - minLat) / (maxLat - minLat || 1);
  return { x, y };
}

const courierIcon = L.divIcon({
  html: '<div class="courierMarker realMarker"><div class="courierPulse" /></div>',
  className: 'mapMarkerWrapper',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const restaurantIcon = L.divIcon({
  html: '<div class="restaurantMarker"></div>',
  className: 'mapMarkerWrapper',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export default function TrackOrder({ orderId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [courierLocation, setCourierLocation] = useState(null);
  const socketRef = useRef(null);

  const activeStatus = liveStatus || tracking?.order?.status || null;

  const fallbackLocation = useMemo(() => {
    if (courierLocation) return courierLocation;
    if (tracking?.courier_location) return tracking.courier_location;
    return { lat: 27.7172, lng: 85.324 }; // Kathmandu fallback for offline map preview
  }, [courierLocation, tracking]);

  const bounds = useMemo(() => {
    const lat0 = fallbackLocation?.lat ?? 27.7172;
    const lng0 = fallbackLocation?.lng ?? 85.324;
    return {
      minLat: lat0 - 0.015,
      maxLat: lat0 + 0.015,
      minLng: lng0 - 0.015,
      maxLng: lng0 + 0.015
    };
  }, [fallbackLocation]);

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
        setCourierLocation(data.courier_location || null);
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load tracking');
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

  const mapXy = useMemo(() => {
    const { x, y } = latLngToXY(fallbackLocation.lat, fallbackLocation.lng, bounds);
    return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
  }, [fallbackLocation, bounds]);

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
        <div className="card muted">No order selected for tracking.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Track Order</h2>
          <div className="muted">Live courier tracking with socket updates.</div>
        </div>
        <div className="pill">Order #{orderId}</div>
      </div>

      {loading ? <div className="card muted">Loading tracking...</div> : null}
      {error ? <div className="card errorCard error">{error}</div> : null}

      {!loading && !error && tracking ? (
        <div className="trackGrid">
          <div className="card">
            <div className="trackMapHeader">
              <div>
                <div style={{ fontWeight: 900, marginBottom: 4 }}>Courier on the way</div>
                <div className="muted">Status: {activeStatus || '—'}</div>
              </div>
              <div className="muted">Total: {formatINR(tracking.order.total_cents)}</div>
            </div>

            <div className="trackMap">
              <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} className="realMap">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline positions={[restaurantLocation, mapCenter]} pathOptions={{ color: '#70ffb9', weight: 4, opacity: 0.9, dashArray: '6 4' }} />
                <Marker position={restaurantLocation} icon={restaurantIcon}>
                  <Tooltip>Restaurant</Tooltip>
                </Marker>
                <Marker position={mapCenter} icon={courierIcon}>
                  <Tooltip>Courier location</Tooltip>
                </Marker>
              </MapContainer>
              {!courierLocation ? <div className="offlineBadge">Offline fallback active</div> : null}
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              ETA (simple): {activeStatus === 'DELIVERED' ? 'Delivered' : activeStatus ? `${tracking.eta_minutes} min` : '—'}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Status timeline</div>
            <div className="timeline">
              {statusTimeline.map(({ st, done }) => (
                <div key={st} className={done ? 'step stepDone' : 'step'}>
                  <div className="stepDot" />
                  <div className="stepLabel">{st.replaceAll('_', ' ')}</div>
                </div>
              ))}
            </div>
            <div className="muted" style={{ marginTop: 12 }}>
              Live updates via Socket.IO.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

