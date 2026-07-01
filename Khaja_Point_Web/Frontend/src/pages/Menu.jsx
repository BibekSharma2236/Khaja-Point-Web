import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export default function Menu({ onAddToCart, cart }) {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    api
      .getMenu()
      .then((data) => {
        if (!alive) return;
        setMenu(data);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || 'Failed to load menu');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const cats = menu ? Object.keys(menu.categories) : [];
    return ['All', ...cats];
  }, [menu]);

  const cartCount = useMemo(() => {
    const map = cart || {};
    return Object.values(map).reduce((sum, v) => sum + (v.quantity || 0), 0);
  }, [cart]);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Menu</h2>
          <div className="muted">Featured biryanis, Nepali favorites, and Kathmandu Valley dining spots</div>
        </div>
        <div className="pill">Cart: {cartCount}</div>
      </div>

      {loading ? <div className="card">Loading menu...</div> : null}
      {error ? <div className="card errorCard">{error}</div> : null}

      {menu ? (
        <div className="grid">
          <div className="filters">
            <div className="filterTitle">Categories</div>
            <div className="chipRow">
              {categories.map((c) => (
                <button
                  key={c}
                  className={c === activeCategory ? 'chip chipActive' : 'chip'}
                  onClick={() => setActiveCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="items">
            {menu.featuredPlaces && menu.featuredPlaces.length > 0 ? (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="sectionHead">
                  <div className="sectionTitle">Restaurants & cafes in Kathmandu Valley</div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {menu.featuredPlaces.map((place) => (
                    <div key={`${place.city}-${place.name}`} className="item">
                      <div className="itemTop">
                        <div className="itemName">{place.name}</div>
                        <div className="pill">{place.type}</div>
                      </div>
                      <div className="itemDesc">{place.description}</div>
                      <div className="mutedSmall">{place.city}, Nepal</div>
                      <div className="mutedSmall">Specialty: {place.specialty}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(activeCategory === 'All'
              ? categories
                  .filter((c) => c !== 'All')
                  .flatMap((c) => menu.categories[c] || [])
              : menu.categories[activeCategory] || []
            ).map((it) => {
              const inCart = cart?.[it.id];
              return (
                <div key={it.id} className="item">
                  <div className="itemTop">
                    <div className="itemName">{it.name}</div>
                    <div className="itemPrice">{formatINR(it.price_cents)}</div>
                  </div>
                  <div className="itemDesc">{it.description}</div>
                  <div className="itemBottom">
                    <button
                      className="btn"
                      onClick={() => onAddToCart(it)}
                      disabled={it.is_available !== 1}
                    >
                      {inCart ? `Add more (${inCart.quantity})` : 'Add to cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

