import { useMemo } from 'react';

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export default function Cart({ cart, setQty, onGoCheckout }) {
  const lines = useMemo(() => {
    const map = cart || {};
    return Object.values(map);
  }, [cart]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price_cents * l.quantity, 0);
    const deliveryFee = subtotal >= 150000 ? 0 : subtotal === 0 ? 0 : 3000;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + deliveryFee + tax;
    return { subtotal, deliveryFee, tax, total };
  }, [lines]);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Cart</h2>
          <div className="muted">Review items & proceed to checkout</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          {lines.length === 0 ? <div className="muted">Cart is empty.</div> : null}
          {lines.map((l) => (
            <div key={l.id} className="cartRow">
              <div>
                <div className="cartName">{l.name}</div>
                <div className="muted">{formatINR(l.price_cents)} each</div>
              </div>
              <div className="qty">
                <button onClick={() => setQty(l.id, Math.max(0, l.quantity - 1))}>-</button>
                <span>{l.quantity}</span>
                <button onClick={() => setQty(l.id, l.quantity + 1)}>+</button>
              </div>
              <div className="cartTotal">{formatINR(l.price_cents * l.quantity)}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Totals</h3>
          <div className="totRow">
            <span>Subtotal</span>
            <span>{formatINR(totals.subtotal)}</span>
          </div>
          <div className="totRow">
            <span>Delivery Fee</span>
            <span>{formatINR(totals.deliveryFee)}</span>
          </div>
          <div className="totRow">
            <span>Tax (5%)</span>
            <span>{formatINR(totals.tax)}</span>
          </div>
          <div className="totRow totGrand">
            <span>Total</span>
            <span>{formatINR(totals.total)}</span>
          </div>
          <button className="btn" onClick={onGoCheckout} disabled={lines.length === 0}>
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

