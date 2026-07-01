import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = [
  'PLACED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'CONFIRMED',
  'PREPARING',
  'ASSIGNED',
  'PICKING_UP',
  'ON_THE_WAY',
  'ARRIVED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
];

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

const emptyOrderItem = { menuItemId: '', quantity: 1 };

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [newOrder, setNewOrder] = useState({
    userEmail: '',
    deliveryName: '',
    deliveryPhone: '',
    deliveryAddress: '',
    deliveryInstructions: '',
    status: 'PLACED',
    items: [emptyOrderItem]
  });

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminOrders();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to load admin orders');
    } finally {
      setLoading(false);
    }
  }

  async function loadMenuItems() {
    try {
      const data = await api.getMenu();
      const items = Object.values(data.categories || {}).flatMap((category) => category || []);
      setMenuItems(items);
    } catch (_) {
      setMenuItems([]);
    }
  }

  useEffect(() => {
    loadOrders();
    loadMenuItems();
  }, []);

  useEffect(() => {
    setStatusMap((prev) => {
      const next = { ...prev };
      orders.forEach((order) => {
        next[order.id] = order.status;
      });
      return next;
    });
  }, [orders]);

  function updateStatusSelection(orderId, status) {
    setStatusMap((prev) => ({ ...prev, [orderId]: status }));
  }

  async function handleStatusChange(orderId, status) {
    setUpdatingId(orderId);
    try {
      await api.updateOrderStatus({ orderId, status });
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
      setStatusMap((prev) => ({ ...prev, [orderId]: status }));
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteOrder(orderId) {
    if (!window.confirm('Delete this order permanently?')) return;
    setUpdatingId(orderId);
    try {
      await api.deleteOrder(orderId);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
    } catch (err) {
      setError(err.message || 'Failed to delete order');
    } finally {
      setUpdatingId(null);
    }
  }

  function updateNewOrder(field, value) {
    setNewOrder((prev) => ({ ...prev, [field]: value }));
  }

  function updateNewItem(index, field, value) {
    setNewOrder((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function addNewOrderItem() {
    setNewOrder((prev) => ({ ...prev, items: [...prev.items, emptyOrderItem] }));
  }

  function removeNewOrderItem(index) {
    setNewOrder((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  async function handleCreateOrder(event) {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);

    try {
      const payload = {
        userEmail: newOrder.userEmail,
        deliveryName: newOrder.deliveryName,
        deliveryPhone: newOrder.deliveryPhone,
        deliveryAddress: newOrder.deliveryAddress,
        deliveryInstructions: newOrder.deliveryInstructions || null,
        status: newOrder.status,
        items: newOrder.items.map((item) => ({
          menuItemId: Number(item.menuItemId),
          quantity: Number(item.quantity)
        }))
      };

      const result = await api.createAdminOrder(payload);
      setCreateSuccess(`Order created successfully (#${result.orderId})`);
      setNewOrder({
        userEmail: '',
        deliveryName: '',
        deliveryPhone: '',
        deliveryAddress: '',
        deliveryInstructions: '',
        status: 'PLACED',
        items: [emptyOrderItem]
      });
      loadOrders();
    } catch (err) {
      setCreateError(err.message || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  }

  const summary = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((order) => !['DELIVERED', 'OUT_FOR_DELIVERY', 'ARRIVED'].includes(order.status)).length;
    const revenue = orders.reduce((sum, order) => sum + Number(order.total_cents || 0), 0);

    return { total, pending, revenue };
  }, [orders]);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Admin dashboard</h2>
          <div className="muted">Monitor orders and update delivery progress in real time.</div>
        </div>
        <button className="btn btnGhost" onClick={() => setShowCreateForm((prev) => !prev)}>
          {showCreateForm ? 'Hide order form' : 'Add new order'}
        </button>
      </div>

      {showCreateForm ? (
        <div className="card">
          <div className="sectionHead">
            <div className="sectionTitle">Create order</div>
          </div>
          <form className="form" onSubmit={handleCreateOrder}>
            <label>
              Customer email
              <input
                type="email"
                value={newOrder.userEmail}
                onChange={(event) => updateNewOrder('userEmail', event.target.value)}
                required
              />
            </label>
            <label>
              Delivery name
              <input
                value={newOrder.deliveryName}
                onChange={(event) => updateNewOrder('deliveryName', event.target.value)}
                required
              />
            </label>
            <label>
              Delivery phone
              <input
                value={newOrder.deliveryPhone}
                onChange={(event) => updateNewOrder('deliveryPhone', event.target.value)}
                required
              />
            </label>
            <label>
              Delivery address
              <textarea
                value={newOrder.deliveryAddress}
                onChange={(event) => updateNewOrder('deliveryAddress', event.target.value)}
                required
              />
            </label>
            <label>
              Instructions
              <textarea
                value={newOrder.deliveryInstructions}
                onChange={(event) => updateNewOrder('deliveryInstructions', event.target.value)}
              />
            </label>
            <label>
              Status
              <select
                value={newOrder.status}
                onChange={(event) => updateNewOrder('status', event.target.value)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <div className="sectionHead">
              <div className="sectionTitle">Order items</div>
              <button type="button" className="btn btnGhost" onClick={addNewOrderItem}>
                Add item
              </button>
            </div>

            {newOrder.items.map((item, index) => (
              <div key={index} className="adminItemRow">
                <label>
                  Menu item
                  <select
                    value={item.menuItemId}
                    onChange={(event) => updateNewItem(index, 'menuItemId', event.target.value)}
                    required
                  >
                    <option value="">Select menu item</option>
                    {menuItems.map((menuItem) => (
                      <option key={menuItem.id} value={menuItem.id}>
                        {menuItem.name} ({formatINR(menuItem.price_cents)})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => updateNewItem(index, 'quantity', event.target.value)}
                    required
                  />
                </label>
                <button type="button" className="btn btnDanger" onClick={() => removeNewOrderItem(index)}>
                  Remove
                </button>
              </div>
            ))}

            {createError ? <div className="error">{createError}</div> : null}
            {createSuccess ? <div className="mutedSmall">{createSuccess}</div> : null}
            <button className="btn" disabled={creating}>
              {creating ? 'Creating order...' : 'Create order'}
            </button>
          </form>
        </div>
      ) : null}

      <div className="adminSummary">
        <div className="card statCard">
          <div className="statValue">{summary.total}</div>
          <div className="statLabel">Total orders</div>
        </div>
        <div className="card statCard">
          <div className="statValue">{summary.pending}</div>
          <div className="statLabel">Active orders</div>
        </div>
        <div className="card statCard">
          <div className="statValue">{formatINR(summary.revenue)}</div>
          <div className="statLabel">Revenue tracked</div>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="muted">Loading orders...</div> : null}
        {error ? <div className="error">{error}</div> : null}

        {!loading && !error && orders.length === 0 ? <div className="emptyState">No orders have been placed yet.</div> : null}

        {!loading && !error && orders.length > 0 ? (
          <div className="adminList">
            {orders.map((order) => (
              <div key={order.id} className="adminOrderCard">
                <div className="adminOrderMain">
                  <div className="adminOrderHeader">
                    <div>
                      <div className="featureName">Order #{order.id}</div>
                      <div className="muted">{order.customer_name || 'Customer'} • {order.customer_email || '—'}</div>
                    </div>
                    <div className="pill">{order.status}</div>
                  </div>

                  <div className="adminMetaGrid">
                    <div>
                      <div className="mutedSmall">Phone</div>
                      <div>{order.delivery_phone}</div>
                    </div>
                    <div>
                      <div className="mutedSmall">Address</div>
                      <div>{order.delivery_address}</div>
                    </div>
                    <div>
                      <div className="mutedSmall">Placed</div>
                      <div>{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="mutedSmall">Total</div>
                      <div>{formatINR(order.total_cents)}</div>
                    </div>
                  </div>
                </div>

                <div className="adminActions">
                  <label className="adminField">
                    <span className="mutedSmall">Status</span>
                    <select
                      value={statusMap[order.id] || order.status}
                      onChange={(event) => updateStatusSelection(order.id, event.target.value)}
                      disabled={updatingId === order.id}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="btn btnGhost" onClick={() => handleStatusChange(order.id, statusMap[order.id] || order.status)} disabled={updatingId === order.id}>
                    {updatingId === order.id ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btnDanger" onClick={() => handleDeleteOrder(order.id)} disabled={updatingId === order.id}>
                    {updatingId === order.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
