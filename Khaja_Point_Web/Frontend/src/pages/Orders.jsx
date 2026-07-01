import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const STATUSES = [
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'PLACED',
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
    setLoading(true);
    setError('');
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
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const order = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder) || null;
  }, [orders, selectedOrder]);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Orders</h2>
          <div className="muted">Track delivery status and payment progress.</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          {loading ? <div className="muted">Loading...</div> : null}
          {error ? <div className="error">{error}</div> : null}
          {!loading && !error ? (
            orders.length === 0 ? (
              <div className="muted">No orders yet.</div>
            ) : (
              <div className="orderList">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    className={o.id === selectedOrder ? 'orderBtn orderBtnActive' : 'orderBtn'}
                    onClick={() => onOpenOrder(o.id)}
                  >
                    <div className="orderTop">
                      <div className="orderId">#{o.id}</div>
                      <div className="orderStatus">{o.status}</div>
                    </div>
                    <div className="muted">Total: {formatINR(o.total_cents)}</div>
                  </button>
                ))}
              </div>
            )
          ) : null}
        </div>

        <div className="card">
          {order ? (
            <div>
              <h3>Order #{order.id}</h3>
              <div className="muted">Current status: {order.status}</div>
              <div className="timeline">
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
              <div className="muted">This view refreshes automatically every 15 seconds.</div>
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn"
                  disabled={!order?.id}
                  onClick={() => {
                    onOpenOrder(order.id);
                    setRoute('track');
                  }}
                >
                  Track live
                </button>
              </div>
            </div>
          ) : (
            <div className="muted">Select an order to view status timeline.</div>
          )}
        </div>
      </div>
    </div>
  );
}

