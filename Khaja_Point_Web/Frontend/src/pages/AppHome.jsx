import { useEffect, useState } from 'react';
import { api } from '../api';

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function flattenMenuItems(menu) {
  if (!menu?.categories) return [];
  return Object.values(menu.categories).flatMap((items) => items || []);
}

const FALLBACK_DISH_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

export default function AppHome({ user, cartCount, onNavigate, onAddToCart }) {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const [menuData, orderData] = await Promise.all([api.getMenu(), api.getOrders()]);
        if (!alive) return;
        setFeaturedItems(flattenMenuItems(menuData).slice(0, 4));
        setOrders(orderData?.orders || []);
      } catch {
        if (!alive) return;
        setFeaturedItems([]);
        setOrders([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const latestOrder = orders[0];
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <section className="heroCard">
        <div>
          <div className="eyebrow">✨ {greeting}, {user?.name || 'Valued Guest'}</div>
          <h1>Craving Kathmandu's finest flavors? Delivered hot.</h1>
          <p className="heroText">
            Savor authentic momos, aromatic biryanis, and Newari feasts prepared by Kathmandu Valley's top chefs and delivered straight to your doorstep.
          </p>
          <div className="heroActions">
            <button className="btn btnPrimary" onClick={() => onNavigate('menu')}>
              Browse full menu →
            </button>
            <button className="btn btnGhost" onClick={() => onNavigate('orders')}>
              Track live orders
            </button>
          </div>
        </div>

        <div className="heroStats">
          <div className="statCard">
            <div className="statValue">{cartCount}</div>
            <div className="statLabel">Items in cart</div>
          </div>
          <div className="statCard">
            <div className="statValue">{orders.length}</div>
            <div className="statLabel">Orders placed</div>
          </div>
          <div className="statCard">
            <div className="statValue">25 min</div>
            <div className="statLabel">Avg delivery</div>
          </div>
        </div>
      </section>

      <div className="dashGrid">
        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="sectionTitle">Today's Chef Specials</div>
              <div className="muted">Hand-crafted signature dishes ready for instant order</div>
            </div>
            <button className="linkBtn" onClick={() => onNavigate('menu')}>View all</button>
          </div>

          {loading ? (
            <div className="emptyState">Loading featured dishes...</div>
          ) : featuredItems.length === 0 ? (
            <div className="emptyState">No featured dishes available yet.</div>
          ) : (
            <div className="featureList">
              {featuredItems.map((item) => (
                <div key={item.id} className="featureItem">
                  <img
                    src={item.image_url || FALLBACK_DISH_IMG}
                    alt={item.name}
                    className="featureThumb"
                    onError={(e) => { e.target.src = FALLBACK_DISH_IMG; }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="featureName">{item.name}</div>
                    <div className="mutedSmall">{item.description}</div>
                  </div>
                  <div className="featureMeta">{formatINR(item.price_cents)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="sectionTitle">Quick shortcuts</div>
              <div className="muted">Order management & cart options</div>
            </div>
          </div>
          <div className="quickList">
            <button className="quickItem" onClick={() => onNavigate('menu')}>
              <span>📖 Browse Explorative Menu</span>
              <span>→</span>
            </button>
            <button className="quickItem" onClick={() => onNavigate('cart')}>
              <span>🛒 View Cart ({cartCount})</span>
              <span>→</span>
            </button>
            <button className="quickItem" onClick={() => onNavigate('orders')}>
              <span>📦 Order History & Live Track</span>
              <span>→</span>
            </button>
          </div>
          <div className="miniNotice">
            🚀 <strong>Live Track Active:</strong> Courier position updates automatically in real-time via Socket.IO.
          </div>
        </div>
      </div>

      <div className="dashGrid">
        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="sectionTitle">Recent Order Status</div>
              <div className="muted">Track your active order progress</div>
            </div>
          </div>
          {latestOrder ? (
            <div className="featureItem" style={{ padding: 16 }}>
              <div>
                <div className="featureName">Order #{latestOrder.id}</div>
                <div className="mutedSmall" style={{ marginTop: 2 }}>Status: <strong style={{ color: 'var(--brand-primary)' }}>{latestOrder.status}</strong></div>
                <div className="mutedSmall">Placed at: {new Date(latestOrder.created_at).toLocaleTimeString()}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div className="featureMeta">{formatINR(latestOrder.total_cents)}</div>
                <button className="btn btnGhost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onNavigate('orders')}>
                  Details →
                </button>
              </div>
            </div>
          ) : (
            <div className="emptyState">No recent orders yet. Your first order will appear here.</div>
          )}
        </div>

        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="sectionTitle">Why Khaja Point?</div>
              <div className="muted">Premium dining built with modern web tech</div>
            </div>
          </div>
          <ul className="bulletList">
            <li className="bulletPoint">Authentic Valley recipes prepared fresh on order</li>
            <li className="bulletPoint">Esewa & Khalti mock instant digital payment options</li>
            <li className="bulletPoint">Live map tracking with Socket.IO courier coordinates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
