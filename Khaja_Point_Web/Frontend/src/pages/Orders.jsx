import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

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

export default function Orders({ onOpenOrder, selectedOrder, setRoute }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.getOrders();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeSelectedId = selectedOrder || (orders.length > 0 ? orders[0].id : null);

  const order = useMemo(() => {
    if (!activeSelectedId) return null;
    return orders.find((o) => o.id === activeSelectedId) || null;
  }, [orders, activeSelectedId]);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Order History & Progress</h2>
          <div className="muted">Track live delivery timeline and order receipt history</div>
        </div>
        <div className="pill">Total Orders: {orders.length}</div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: 14 }}>Your Recent Orders</h3>
          {loading ? <div className="muted">Loading orders...</div> : null}
          {error ? <div className="error">{error}</div> : null}
          {!loading && !error ? (
            orders.length === 0 ? (
              <div className="emptyState">No orders placed yet. Explore our menu to get started!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders.map((o) => {
                  const isSelected = o.id === activeSelectedId;
                  return (
                    <div
                      key={o.id}
                      onClick={() => onOpenOrder(o.id)}
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        background: isSelected ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-glass)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Order #{o.id}</div>
                        <div className="mutedSmall">{new Date(o.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="pill" style={{ display: 'inline-block', fontSize: '0.75rem', marginBottom: 4 }}>
                          {o.status}
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>{formatINR(o.total_cents)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : null}
        </div>

        <div className="card">
          {order ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1.35rem' }}>Order #{order.id}</h3>
                  <div className="mutedSmall">Placed by {order.delivery_name || 'Customer'}</div>
                </div>
                <div className="pill" style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>
                  {order.status}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 14, borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 Delivery Address:</div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: 2 }}>{order.delivery_address}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>📞 Contact: {order.delivery_phone}</div>
              </div>

              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 10 }}>Progress Status</div>
              <div className="timeline" style={{ marginBottom: 20 }}>
                {STATUSES.map((s) => {
                  const idx = statusIndex(order.status);
                  const thisIdx = statusIndex(s);
                  const done = thisIdx <= idx;
                  return (
                    <div key={s} className={done ? 'step stepDone' : 'step'}>
                      <div className="stepDot" />
                      <div className="stepLabel">{s.replaceAll('_', ' ')}</div>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn"
                onClick={() => {
                  onOpenOrder(order.id);
                  setRoute('track');
                }}
              >
                📡 Open Live Map Telemetry →
              </button>
            </div>
          ) : (
            <div className="emptyState">Select an order on the left to inspect timeline.</div>
          )}
        </div>
      </div>
    </div>
  );
}
