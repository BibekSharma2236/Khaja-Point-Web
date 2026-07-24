import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

const FALLBACK_DISH_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

export default function Menu({ onAddToCart, cart, setQty }) {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [selectedDishModal, setSelectedDishModal] = useState(null);

  // Favorites state
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('khaja_favs') || '[]');
    } catch {
      return [];
    }
  });

  // Customization modal options
  const [spiceLevel, setSpiceLevel] = useState('Medium');
  const [extraChutney, setExtraChutney] = useState(false);
  const [extraCheese, setExtraCheese] = useState(false);
  const [kitchenNote, setKitchenNote] = useState('');

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

  function toggleFavorite(id) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('khaja_favs', JSON.stringify(next));
      return next;
    });
  }

  const categories = useMemo(() => {
    const cats = menu ? Object.keys(menu.categories) : [];
    return ['All', 'Favorites ❤️', ...cats];
  }, [menu]);

  const allItems = useMemo(() => {
    if (!menu?.categories) return [];
    return Object.entries(menu.categories).flatMap(([categoryName, items]) =>
      (items || []).map((item) => ({ ...item, category: categoryName }))
    );
  }, [menu]);

  const filteredItems = useMemo(() => {
    let list = [];
    if (activeCategory === 'All') {
      list = allItems;
    } else if (activeCategory === 'Favorites ❤️') {
      list = allItems.filter((item) => favorites.includes(item.id));
    } else {
      list = allItems.filter((item) => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-low') {
      list = [...list].sort((a, b) => a.price_cents - b.price_cents);
    } else if (sortBy === 'price-high') {
      list = [...list].sort((a, b) => b.price_cents - a.price_cents);
    }

    return list;
  }, [allItems, activeCategory, searchQuery, sortBy, favorites]);

  const cartCount = useMemo(() => {
    const map = cart || {};
    return Object.values(map).reduce((sum, v) => sum + (v.quantity || 0), 0);
  }, [cart]);

  function handleOpenDishModal(dish) {
    setSelectedDishModal(dish);
    setSpiceLevel('Medium');
    setExtraChutney(false);
    setExtraCheese(false);
    setKitchenNote('');
  }

  function handleAddCustomizedDish() {
    if (!selectedDishModal) return;
    let addPriceCents = 0;
    if (extraChutney) addPriceCents += 3000;
    if (extraCheese) addPriceCents += 5000;

    const customizedItem = {
      ...selectedDishModal,
      price_cents: selectedDishModal.price_cents + addPriceCents,
      name: extraChutney || extraCheese ? `${selectedDishModal.name} (${spiceLevel})` : selectedDishModal.name
    };

    onAddToCart(customizedItem);
    setSelectedDishModal(null);
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Explorative Menu</h2>
          <div className="muted">Discover authentic Nepali delicacies, biryanis, and street eats.</div>
        </div>
        <div className="pill">🛒 Cart: {cartCount} items</div>
      </div>

      {loading ? <div className="card muted">Loading culinary offerings...</div> : null}
      {error ? <div className="card error">{error}</div> : null}

      {menu ? (
        <>
          <div className="filterBar">
            <div className="searchInputWrap">
              <span className="searchIcon">🔍</span>
              <input
                type="text"
                placeholder="Search biryani, momo, thali, beverages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="mutedSmall" style={{ fontWeight: 700 }}>Sort by:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 'auto' }}>
                <option value="default">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="grid">
            <div className="filters">
              <div className="filterTitle">Categories</div>
              <div className="chipRow">
                {categories.map((c) => {
                  let count = 0;
                  if (c === 'All') count = allItems.length;
                  else if (c === 'Favorites ❤️') count = favorites.length;
                  else count = (menu.categories[c] || []).length;

                  return (
                    <button
                      key={c}
                      className={c === activeCategory ? 'chip chipActive' : 'chip'}
                      onClick={() => setActiveCategory(c)}
                    >
                      <span>{c}</span>
                      <span className="mutedSmall">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {menu.featuredPlaces && menu.featuredPlaces.length > 0 && activeCategory === 'All' && !searchQuery ? (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="sectionHead">
                    <div className="sectionTitle">Kathmandu Valley Partner Kitchens</div>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {menu.featuredPlaces.map((place) => (
                      <div key={`${place.city}-${place.name}`} className="statCard" style={{ padding: 14 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{place.name}</div>
                        <div className="pill" style={{ display: 'inline-block', margin: '6px 0', fontSize: '0.72rem' }}>{place.type}</div>
                        <div className="mutedSmall">{place.description}</div>
                        <div className="mutedSmall" style={{ marginTop: 4, color: 'var(--brand-primary)' }}>📍 {place.city}, Nepal</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {filteredItems.length === 0 ? (
                <div className="emptyState">
                  {activeCategory === 'Favorites ❤️'
                    ? 'No favorite dishes saved yet. Click the heart icon on any dish to save it!'
                    : 'No dishes match your search criteria.'}
                </div>
              ) : (
                <div className="items">
                  {filteredItems.map((it) => {
                    const inCart = cart?.[it.id];
                    const imgUrl = it.image_url && it.image_url.trim() !== '' ? it.image_url : FALLBACK_DISH_IMG;
                    const isFav = favorites.includes(it.id);

                    return (
                      <div key={it.id} className="itemCard">
                        <div className="itemImageWrap">
                          <img
                            src={imgUrl}
                            alt={it.name}
                            className="itemImage"
                            onClick={() => handleOpenDishModal(it)}
                            onError={(e) => { e.target.src = FALLBACK_DISH_IMG; }}
                          />
                          <div className="itemBadge">{it.category}</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(it.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              background: 'rgba(11, 13, 20, 0.85)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '50%',
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              color: isFav ? '#ef4444' : '#ffffff'
                            }}
                          >
                            {isFav ? '❤️' : '🤍'}
                          </button>
                        </div>

                        <div className="itemBody">
                          <div className="itemTop">
                            <div className="itemName" onClick={() => handleOpenDishModal(it)} style={{ cursor: 'pointer' }}>
                              {it.name}
                            </div>
                            <div className="itemPrice">{formatINR(it.price_cents)}</div>
                          </div>
                          <div className="itemDesc">{it.description}</div>

                          <div className="itemBottom">
                            {inCart ? (
                              <div className="qtyStepper">
                                <button className="qtyBtn" onClick={() => setQty?.(it.id, inCart.quantity - 1)}>-</button>
                                <span className="qtyCount">{inCart.quantity} in cart</span>
                                <button className="qtyBtn" onClick={() => onAddToCart(it)}>+</button>
                              </div>
                            ) : (
                              <button
                                className="btn"
                                onClick={() => handleOpenDishModal(it)}
                                disabled={it.is_available !== 1}
                              >
                                {it.is_available === 1 ? 'Add to cart' : 'Out of stock'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* DISH CUSTOMIZATION & PREVIEW MODAL */}
      {selectedDishModal ? (
        <div className="modalOverlay" onClick={() => setSelectedDishModal(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedDishModal(null)}>✕</button>

            <img
              src={selectedDishModal.image_url || FALLBACK_DISH_IMG}
              alt={selectedDishModal.name}
              style={{ width: '100%', height: 210, objectFit: 'cover', borderRadius: 16, marginBottom: 16 }}
              onError={(e) => { e.target.src = FALLBACK_DISH_IMG; }}
            />

            <div className="eyebrow">{selectedDishModal.category}</div>
            <h2 style={{ fontSize: '1.6rem', marginTop: 4 }}>{selectedDishModal.name}</h2>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-primary)', margin: '6px 0' }}>
              {formatINR(selectedDishModal.price_cents + (extraChutney ? 3000 : 0) + (extraCheese ? 5000 : 0))}
            </div>
            <p className="muted" style={{ lineHeight: 1.5, marginBottom: 16, fontSize: '0.9rem' }}>
              {selectedDishModal.description}
            </p>

            <div className="form" style={{ gap: 12 }}>
              <label>
                🌶️ Select Spice Level
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['Mild 🟢', 'Medium 🟠', 'Extra Hot 🔴'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={spiceLevel === lvl.split(' ')[0] ? 'chip chipActive' : 'chip'}
                      style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem', justifyContent: 'center' }}
                      onClick={() => setSpiceLevel(lvl.split(' ')[0])}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </label>

              <label>
                ➕ Add-ons
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, fontWeight: 500, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={extraChutney}
                      onChange={(e) => setExtraChutney(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <span>Spicy Sesame Chutney Dip (+₹30)</span>
                  </label>

                  <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, fontWeight: 500, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={extraCheese}
                      onChange={(e) => setExtraCheese(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <span>Extra Melted Cheese (+₹50)</span>
                  </label>
                </div>
              </label>

              <label>
                📝 Kitchen Special Requests
                <input
                  type="text"
                  placeholder="e.g. Less oil, extra onions..."
                  value={kitchenNote}
                  onChange={(e) => setKitchenNote(e.target.value)}
                />
              </label>

              <button className="btn" onClick={handleAddCustomizedDish} style={{ marginTop: 8 }}>
                Add to Cart • {formatINR(selectedDishModal.price_cents + (extraChutney ? 3000 : 0) + (extraCheese ? 5000 : 0))}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
