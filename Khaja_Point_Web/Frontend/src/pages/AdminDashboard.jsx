import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = [
  'PLACED',
  'PAYMENT_SUCCESS',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
];

const CATEGORY_OPTIONS = [
  'Biryani',
  'Momo',
  'Nepali',
  'Nepali BBQ',
  'Newari',
  'Thakali',
  'Desserts',
  'Breakfast',
  'Pizza',
  'Burgers',
  'Starters',
  'Soups',
  'Beverages',
  'General'
];

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

const emptyOrderItem = { menuItemId: '', quantity: 1 };
const FALLBACK_DISH_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'menu', 'create'
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Menu Manager State
  const [menuSearch, setMenuSearch] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price_rupees: '',
    image_url: '',
    category: 'Biryani',
    is_available: 1
  });

  // New Order State
  const [creatingOrder, setCreatingOrder] = useState(false);
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
    setLoadingOrders(true);
    try {
      const data = await api.getAdminOrders();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  }

  async function loadMenuItems() {
    setLoadingMenu(true);
    try {
      const data = await api.getAdminMenuItems();
      setMenuItems(data.items || []);
    } catch (_) {
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  }

  useEffect(() => {
    loadOrders();
    loadMenuItems();
  }, []);

  // Order Handlers
  async function handleStatusChange(orderId, status) {
    setUpdatingId(orderId);
    try {
      await api.updateOrderStatus({ orderId, status });
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    } catch (err) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteOrder(orderId) {
    if (!window.confirm(`Permanently delete Order #${orderId}?`)) return;
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

  // Menu Item Handlers
  function openNewItemModal() {
    setEditingItem(null);
    setItemForm({
      name: '',
      description: '',
      price_rupees: '499',
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      category: 'Biryani',
      is_available: 1
    });
    setShowItemModal(true);
  }

  function openEditItemModal(item) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price_rupees: String(item.price_cents / 100),
      image_url: item.image_url || '',
      category: item.category || 'General',
      is_available: item.is_available
    });
    setShowItemModal(true);
  }

  async function handleSaveMenuItem(e) {
    e.preventDefault();
    setError('');
    const priceCents = Math.round(Number(itemForm.price_rupees) * 100);
    if (!itemForm.name || isNaN(priceCents)) {
      setError('Please provide a valid dish name and price in rupees.');
      return;
    }

    try {
      if (editingItem) {
        await api.updateMenuItem(editingItem.id, {
          name: itemForm.name,
          description: itemForm.description,
          price_cents: priceCents,
          image_url: itemForm.image_url,
          category: itemForm.category,
          is_available: itemForm.is_available
        });
      } else {
        await api.createMenuItem({
          name: itemForm.name,
          description: itemForm.description,
          price_cents: priceCents,
          image_url: itemForm.image_url,
          category: itemForm.category,
          is_available: itemForm.is_available
        });
      }
      setShowItemModal(false);
      loadMenuItems();
    } catch (err) {
      setError(err.message || 'Failed to save menu item');
    }
  }

  async function handleToggleAvailability(item) {
    try {
      const res = await api.toggleMenuItemAvailability(item.id);
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: res.is_available } : i))
      );
    } catch (err) {
      setError(err.message || 'Failed to toggle availability');
    }
  }

  async function handleDeleteMenuItem(id) {
    if (!window.confirm('Delete this menu item permanently from database?')) return;
    try {
      await api.deleteMenuItem(id);
      setMenuItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete menu item');
    }
  }

  // Create Order Handlers
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

  async function handleCreateOrder(e) {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreatingOrder(true);

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
      setCreateSuccess(`Order #${result.orderId} created successfully!`);
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
      setCreatingOrder(false);
    }
  }

  // Analytics Metrics
  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const activeDispatches = orders.filter((o) => o.status !== 'DELIVERED').length;
    const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_cents || 0), 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return { totalOrders, activeDispatches, deliveredCount, totalRevenue, avgOrderValue };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (statusFilter !== 'ALL') {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase().trim();
      list = list.filter(
        (o) =>
          String(o.id).includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.delivery_address && o.delivery_address.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, statusFilter, orderSearch]);

  const filteredMenuItems = useMemo(() => {
    if (!menuSearch.trim()) return menuItems;
    const q = menuSearch.toLowerCase().trim();
    return menuItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [menuItems, menuSearch]);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Super Advanced Admin Console</h2>
          <div className="muted">Full-stack control room for dispatches, live telemetry, and menu management</div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={activeTab === 'orders' ? 'btn btnPrimary' : 'btn btnGhost'}
            onClick={() => setActiveTab('orders')}
          >
            📦 Orders ({orders.length})
          </button>
          <button
            className={activeTab === 'menu' ? 'btn btnPrimary' : 'btn btnGhost'}
            onClick={() => setActiveTab('menu')}
          >
            🍔 Menu Manager ({menuItems.length})
          </button>
          <button
            className={activeTab === 'create' ? 'btn btnPrimary' : 'btn btnGhost'}
            onClick={() => setActiveTab('create')}
          >
            ➕ Create Dispatch
          </button>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="adminSummary">
        <div className="card statCard">
          <div className="statValue" style={{ color: 'var(--brand-primary)' }}>{formatINR(summary.totalRevenue)}</div>
          <div className="statLabel">Total Gross Revenue</div>
        </div>
        <div className="card statCard">
          <div className="statValue" style={{ color: 'var(--accent-gold)' }}>{summary.activeDispatches}</div>
          <div className="statLabel">Active Kitchen Dispatches</div>
        </div>
        <div className="card statCard">
          <div className="statValue" style={{ color: 'var(--accent-green)' }}>{summary.deliveredCount}</div>
          <div className="statLabel">Successfully Delivered</div>
        </div>
        <div className="card statCard">
          <div className="statValue" style={{ color: 'var(--accent-blue)' }}>{formatINR(summary.avgOrderValue)}</div>
          <div className="statLabel">Avg Order Value</div>
        </div>
      </div>

      {error ? <div className="card error">{error}</div> : null}

      {/* TAB 1: ORDER MANAGEMENT */}
      {activeTab === 'orders' ? (
        <div className="card">
          <div className="filterBar">
            <div className="searchInputWrap">
              <span className="searchIcon">🔍</span>
              <input
                type="text"
                placeholder="Search orders by ID, Customer name, or Address..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mutedSmall" style={{ fontWeight: 700 }}>Filter Status:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
                <option value="ALL">All Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>{st.replaceAll('_', ' ')}</option>
                ))}
              </select>
              <button className="btn btnGhost" style={{ width: 'auto' }} onClick={loadOrders}>↻ Refresh</button>
            </div>
          </div>

          {loadingOrders ? <div className="muted">Fetching order telemetry...</div> : null}

          {!loadingOrders && filteredOrders.length === 0 ? (
            <div className="emptyState">No dispatches matching search criteria.</div>
          ) : null}

          {!loadingOrders && filteredOrders.length > 0 ? (
            <div className="adminList">
              {filteredOrders.map((order) => (
                <div key={order.id} className="adminOrderCard">
                  <div className="adminOrderHeader">
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>
                        Order #{order.id}
                      </div>
                      <div className="mutedSmall">
                        Customer: <strong>{order.customer_name || 'Valued Guest'}</strong> ({order.customer_email || '—'})
                      </div>
                    </div>
                    <div className="pill" style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>
                      {order.status}
                    </div>
                  </div>

                  <div className="adminMetaGrid">
                    <div>
                      <div className="mutedSmall">Phone</div>
                      <div style={{ fontWeight: 700 }}>📞 {order.delivery_phone}</div>
                    </div>
                    <div>
                      <div className="mutedSmall">Delivery Address</div>
                      <div style={{ fontWeight: 700 }}>📍 {order.delivery_address}</div>
                    </div>
                    <div>
                      <div className="mutedSmall">Placed Timestamp</div>
                      <div style={{ fontWeight: 700 }}>{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="mutedSmall">Total Payable</div>
                      <div style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '1.1rem' }}>
                        {formatINR(order.total_cents)}
                      </div>
                    </div>
                  </div>

                  <div className="adminActions">
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <span className="mutedSmall" style={{ fontWeight: 700 }}>1-Click Status Update</span>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={updatingId === order.id}
                        style={{ marginTop: 4 }}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className="btn btnDanger"
                      onClick={() => handleDeleteOrder(order.id)}
                      disabled={updatingId === order.id}
                      style={{ width: 'auto' }}
                    >
                      {updatingId === order.id ? 'Removing...' : 'Delete Order'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* TAB 2: MENU ITEM MANAGER */}
      {activeTab === 'menu' ? (
        <div className="card">
          <div className="filterBar">
            <div className="searchInputWrap">
              <span className="searchIcon">🔍</span>
              <input
                type="text"
                placeholder="Search menu item name or category..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />
            </div>
            <button className="btn btnPrimary" style={{ width: 'auto' }} onClick={openNewItemModal}>
              + Add New Dish
            </button>
          </div>

          {loadingMenu ? <div className="muted">Loading menu items database...</div> : null}

          {!loadingMenu && filteredMenuItems.length === 0 ? (
            <div className="emptyState">No menu items found.</div>
          ) : null}

          {!loadingMenu && filteredMenuItems.length > 0 ? (
            <div className="items" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {filteredMenuItems.map((item) => (
                <div key={item.id} className="itemCard" style={{ opacity: item.is_available === 1 ? 1 : 0.6 }}>
                  <div className="itemImageWrap">
                    <img
                      src={item.image_url || FALLBACK_DISH_IMG}
                      alt={item.name}
                      className="itemImage"
                      onError={(e) => { e.target.src = FALLBACK_DISH_IMG; }}
                    />
                    <div className="itemBadge">{item.category}</div>
                  </div>

                  <div className="itemBody">
                    <div className="itemTop">
                      <div className="itemName">{item.name}</div>
                      <div className="itemPrice">{formatINR(item.price_cents)}</div>
                    </div>
                    <div className="itemDesc">{item.description}</div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10 }}>
                      <button
                        className={item.is_available === 1 ? 'btn btnSuccess' : 'btn btnGhost'}
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        onClick={() => handleToggleAvailability(item)}
                      >
                        {item.is_available === 1 ? 'In Stock ✓' : 'Out of Stock ✕'}
                      </button>
                      <button
                        className="btn btnGhost"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        onClick={() => openEditItemModal(item)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btnDanger"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        onClick={() => handleDeleteMenuItem(item.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* TAB 3: CREATE MANUAL DISPATCH */}
      {activeTab === 'create' ? (
        <div className="card">
          <div className="sectionHead">
            <div className="sectionTitle">Create Custom Walk-in / Phone Order</div>
          </div>
          <form className="form" onSubmit={handleCreateOrder}>
            <div className="grid2">
              <label>
                Customer Email
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newOrder.userEmail}
                  onChange={(e) => updateNewOrder('userEmail', e.target.value)}
                  required
                />
              </label>
              <label>
                Recipient Name
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newOrder.deliveryName}
                  onChange={(e) => updateNewOrder('deliveryName', e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid2">
              <label>
                Phone Number
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={newOrder.deliveryPhone}
                  onChange={(e) => updateNewOrder('deliveryPhone', e.target.value)}
                  required
                />
              </label>
              <label>
                Dispatch Status
                <select
                  value={newOrder.status}
                  onChange={(e) => updateNewOrder('status', e.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Delivery Address
              <textarea
                value={newOrder.deliveryAddress}
                onChange={(e) => updateNewOrder('deliveryAddress', e.target.value)}
                required
              />
            </label>

            <div className="sectionHead" style={{ marginTop: 10 }}>
              <div className="sectionTitle">Order Line Items</div>
              <button type="button" className="btn btnGhost" style={{ padding: '6px 14px' }} onClick={() => setNewOrder((prev) => ({ ...prev, items: [...prev.items, emptyOrderItem] }))}>
                + Add Item
              </button>
            </div>

            {newOrder.items.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 12, alignItems: 'flex-end' }}>
                <label>
                  Select Dish
                  <select
                    value={item.menuItemId}
                    onChange={(e) => updateNewItem(index, 'menuItemId', e.target.value)}
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
                  Qty
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateNewItem(index, 'quantity', e.target.value)}
                    required
                  />
                </label>
                <button
                  type="button"
                  className="btn btnDanger"
                  style={{ padding: '12px 14px' }}
                  onClick={() => setNewOrder((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                >
                  ✕
                </button>
              </div>
            ))}

            {createError ? <div className="error">{createError}</div> : null}
            {createSuccess ? <div className="miniNotice">{createSuccess}</div> : null}

            <button className="btn" disabled={creatingOrder} style={{ marginTop: 14 }}>
              {creatingOrder ? 'Submitting Order...' : 'Create & Dispatch Order'}
            </button>
          </form>
        </div>
      ) : null}

      {/* EDIT / CREATE MENU ITEM MODAL */}
      {showItemModal ? (
        <div className="modalOverlay" onClick={() => setShowItemModal(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setShowItemModal(false)}>✕</button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 16 }}>
              {editingItem ? `Edit Dish #${editingItem.id}` : 'Add New Culinary Dish'}
            </h2>

            <form onSubmit={handleSaveMenuItem} className="form">
              <label>
                Dish Name
                <input
                  type="text"
                  placeholder="e.g. Chicken Momo Special"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>

              <div className="grid2">
                <label>
                  Category
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Price (₹ Rupees)
                  <input
                    type="number"
                    step="0.01"
                    placeholder="499"
                    value={itemForm.price_rupees}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, price_rupees: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <label>
                Dish Image URL (HD Photo)
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, image_url: e.target.value }))}
                />
              </label>

              <label>
                Description
                <textarea
                  placeholder="Ingredients, culinary details..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>

              <button className="btn" style={{ marginTop: 10 }}>
                {editingItem ? 'Save Changes' : 'Create Menu Item'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
