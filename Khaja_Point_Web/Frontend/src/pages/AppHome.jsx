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

export default function AppHome({ user, cartCount, onNavigate }) {
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
        setFeaturedItems(flattenMenuItems(menuData).slice(0, 3));
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
          <div className="eyebrow">{greeting}, {user?.name || 'guest'}</div>
          <h1>Fresh meals, quick delivery, and a smoother ordering experience.</h1>
          <p className="heroText">
            Explore signature dishes, keep your cart ready, and follow every order from kitchen to doorstep.
          </p>
          <div className="heroActions">
            <button className="btn btnPrimary" onClick={() => onNavigate('menu')}>
              Browse menu
            </button>
            <button className="btn btnGhost" onClick={() => onNavigate('orders')}>
              Track orders
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
            <div className="statValue">24/7</div>
            <div className="statLabel">Kitchen support</div>
          </div>
        </div>
      </section>

      <div className="dashGrid">
        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="sectionTitle">Featured dishes</div>
              <div className="muted">Popular favorites available right now</div>
            </div>
          </div>

          {loading ? (
            <div className="emptyState">Loading featured items...</div>
          ) : featuredItems.length === 0 ? (
            <div className="emptyState">No featured dishes available yet.</div>
          ) : (
            <div className="featureList">
              {featuredItems.map((item) => (
                <div key={item.id} className="featureItem">
                  <div>
                    <div className="featureName">{item.name}</div>
                    <div className="muted">{item.description}</div>
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
              <div className="sectionTitle">Quick actions</div>
              <div className="muted">Move from browsing to checkout in seconds</div>
            </div>
          </div>
          <div className="quickList">
            <button className="quickItem" onClick={() => onNavigate('menu')}>
              Browse menu
            </button>
            <button className="quickItem" onClick={() => onNavigate('cart')}>
              View cart
            </button>
            <button className="quickItem" onClick={() => onNavigate('orders')}>
              View orders
            </button>
          </div>
          <div className="miniNotice">
            Your current cart contains {cartCount} item{cartCount === 1 ? '' : 's'}.
          </div>
        </div>
      </div>

      <div className="dashGrid">
        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="sectionTitle">Latest order</div>
              <div className="muted">Stay updated with the newest delivery progress</div>
            </div>
          </div>
          {latestOrder ? (
            <div className="featureItem">
              <div>
                <div className="featureName">Order #{latestOrder.id}</div>
                <div className="muted">Status: {latestOrder.status}</div>
              </div>
              <div className="featureMeta">{formatINR(latestOrder.total_cents)}</div>
            </div>
          ) : (
            <div className="emptyState">No orders yet. Your first order will appear here.</div>
          )}
        </div>

        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="sectionTitle">Why it stands out</div>
              <div className="muted">Hospitality, speed, and clarity built in</div>
            </div>
          </div>
          <ul className="bulletList">
            <li className="bulletPoint">Elegant, responsive design for desktop and mobile</li>
            <li className="bulletPoint">Secure authentication and session handling</li>
            <li className="bulletPoint">Live delivery updates with a polished tracking view</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

