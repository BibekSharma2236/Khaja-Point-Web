import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { clearToken, getToken } from './authStore';
import AppHome from './pages/AppHome';
import Login from './pages/Login';
import Register from './pages/Register';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import TrackOrder from './pages/TrackOrder';
import AdminDashboard from './pages/AdminDashboard';
import logo from './logo.svg';

const ROUTES = {
  LOGIN: 'login',
  REGISTER: 'register',
  DASHBOARD: 'dashboard',
  ADMIN: 'admin',
  MENU: 'menu',
  CART: 'cart',
  CHECKOUT: 'checkout',
  ORDERS: 'orders',
  TRACK: 'track'
};

export default function App() {
  const [route, setRoute] = useState(ROUTES.LOGIN);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [cart, setCart] = useState({});
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, item) => sum + item.quantity, 0), [cart]);

  function refreshSession() {
    const token = getToken();
    if (!token) {
      setUser(null);
      setRoute(ROUTES.LOGIN);
      return;
    }

    api
      .me()
      .then((data) => {
        setUser(data.user);
        setRoute(ROUTES.DASHBOARD);
      })
      .catch(() => {
        clearToken();
        setUser(null);
        setAuthError('Session expired. Please login again.');
        setRoute(ROUTES.LOGIN);
      });
  }

  useEffect(() => {
    refreshSession();
  }, []);

  useEffect(() => {
    if (user && route === ROUTES.ADMIN && user.role !== 'admin') {
      setRoute(ROUTES.DASHBOARD);
    }
  }, [route, user]);

  function addToCart(item) {
    setCart((prev) => {
      const next = { ...prev };
      const id = item.id;
      const existing = next[id];
      if (existing) {
        next[id] = { ...existing, quantity: existing.quantity + 1 };
      } else {
        next[id] = {
          id,
          name: item.name,
          price_cents: item.price_cents,
          quantity: 1
        };
      }
      return next;
    });
  }

  function setQty(menuItemId, qty) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[menuItemId];
      else next[menuItemId] = { ...next[menuItemId], quantity: qty };
      return next;
    });
  }

  function logout() {
    clearToken();
    setUser(null);
    setCart({});
    setCheckoutOrder(null);
    setSelectedOrderId(null);
    setAuthError('');
    setRoute(ROUTES.LOGIN);
  }

  function handleAuthSuccess() {
    setAuthError('');
    refreshSession();
  }

  return (
    <div className="appShell">
      {user ? (
        <header className="nav">
          <div className="brandWrap">
            <img src={logo} alt="Khaja Point logo" className="brandLogo" />
            <div>
              <div className="brand">Khaja Point</div>
              <div className="brandSub">Premium delivery dashboard</div>
            </div>
          </div>
          <nav className="navLinks">
            <button className={route === ROUTES.DASHBOARD ? 'navBtn navBtnActive' : 'navBtn'} onClick={() => setRoute(ROUTES.DASHBOARD)}>
              Dashboard
            </button>
            <button className={route === ROUTES.MENU ? 'navBtn navBtnActive' : 'navBtn'} onClick={() => setRoute(ROUTES.MENU)}>
              Menu
            </button>
            <button className={route === ROUTES.CART ? 'navBtn navBtnActive' : 'navBtn'} onClick={() => setRoute(ROUTES.CART)}>
              Cart <span className="navBadge">{cartCount}</span>
            </button>
            <button className={route === ROUTES.ORDERS ? 'navBtn navBtnActive' : 'navBtn'} onClick={() => setRoute(ROUTES.ORDERS)}>
              Orders
            </button>
            {user?.role === 'admin' ? (
              <button className={route === ROUTES.ADMIN ? 'navBtn navBtnActive' : 'navBtn'} onClick={() => setRoute(ROUTES.ADMIN)}>
                Admin
              </button>
            ) : null}
          </nav>
          <div className="navRight">
            <div className="mutedSmall">Hello, {user.name}</div>
            <button className="btn btnGhost" onClick={logout}>Logout</button>
          </div>
        </header>
      ) : null}

      {!user ? (
        <div className="authWrap">
          <div className="authPanel">
            <div className="authHero">
              <div className="eyebrow">Modern food ordering</div>
              <h1>Khaja Point</h1>
              <p className="heroText">A polished, full-stack dining experience with live order tracking, seamless checkout, and an elegant dashboard.</p>
              <ul className="bulletList">
                <li className="bulletPoint">Fast checkout with mock Esewa and COD</li>
                <li className="bulletPoint">Live order progress and delivery updates</li>
                <li className="bulletPoint">Beautiful menu browsing and cart flow</li>
              </ul>
            </div>
            <div className="authFormBox">
              {route === ROUTES.REGISTER ? <Register onAuthed={handleAuthSuccess} /> : <Login onAuthed={handleAuthSuccess} />}
              <div className="authFooter">
                {authError ? <div className="error">{authError}</div> : null}
                <button className="linkBtn" onClick={() => setRoute(route === ROUTES.REGISTER ? ROUTES.LOGIN : ROUTES.REGISTER)}>
                  {route === ROUTES.REGISTER ? 'Already have an account? Login' : 'New here? Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {user ? (
        <main className="main">
          {route === ROUTES.DASHBOARD ? <AppHome user={user} cartCount={cartCount} onNavigate={setRoute} /> : null}

          {route === ROUTES.MENU ? <Menu onAddToCart={addToCart} cart={cart} /> : null}

          {route === ROUTES.CART ? <Cart cart={cart} setQty={setQty} onGoCheckout={() => setRoute(ROUTES.CHECKOUT)} /> : null}

          {route === ROUTES.CHECKOUT ? (
            <Checkout
              cart={cart}
              onSuccess={(data) => {
                setCheckoutOrder(data);
                setSelectedOrderId(data.orderId);
                setCart({});
                setRoute(ROUTES.ORDERS);
              }}
            />
          ) : null}

          {route === ROUTES.ORDERS ? <Orders selectedOrder={selectedOrderId} onOpenOrder={setSelectedOrderId} setRoute={setRoute} /> : null}

          {route === ROUTES.ADMIN && user?.role === 'admin' ? <AdminDashboard /> : null}

          {route === ROUTES.TRACK ? <TrackOrder orderId={selectedOrderId} /> : null}
        </main>
      ) : null}
    </div>
  );
}

