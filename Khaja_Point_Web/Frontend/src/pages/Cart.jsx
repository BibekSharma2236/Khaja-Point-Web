import { useMemo, useState } from 'react';

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

const FALLBACK_DISH_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

export default function Cart({ cart, setQty, onGoCheckout }) {
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  const lines = useMemo(() => {
    const map = cart || {};
    return Object.values(map);
  }, [cart]);

  function applyPromo() {
    const code = promoCode.toUpperCase().trim();
    if (code === 'KHAJA10') {
      setDiscountPercent(10);
      setPromoMessage('🎉 KHAJA10 applied! 10% discount subtracted.');
    } else if (code === 'WELCOME20') {
      setDiscountPercent(20);
      setPromoMessage('🎉 WELCOME20 applied! 20% discount subtracted.');
    } else {
      setDiscountPercent(0);
      setPromoMessage('❌ Invalid coupon code. Try KHAJA10 or WELCOME20.');
    }
  }

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price_cents * l.quantity, 0);
    const discount = Math.round(subtotal * (discountPercent / 100));
    const discountedSubtotal = subtotal - discount;
    const deliveryFee = discountedSubtotal >= 150000 ? 0 : discountedSubtotal === 0 ? 0 : 3000;
    const tax = Math.round(discountedSubtotal * 0.05);
    const total = discountedSubtotal + deliveryFee + tax;
    return { subtotal, discount, deliveryFee, tax, total };
  }, [lines, discountPercent]);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Your Cart</h2>
          <div className="muted">Review selected items, apply promo codes, and calculate payable total.</div>
        </div>
        <div className="pill">{lines.length} Unique item{lines.length === 1 ? '' : 's'}</div>
      </div>

      <div className="grid2">
        <div className="card">
          {lines.length === 0 ? (
            <div className="emptyState">
              🛒 Your cart is empty.<br />Browse the menu to add delicious meals!
            </div>
          ) : null}

          {lines.map((l) => (
            <div key={l.id} className="cartRow">
              <img
                src={l.image_url || FALLBACK_DISH_IMG}
                alt={l.name}
                className="cartThumb"
                onError={(e) => { e.target.src = FALLBACK_DISH_IMG; }}
              />
              <div>
                <div className="cartName">{l.name}</div>
                <div className="mutedSmall">{formatINR(l.price_cents)} per item</div>
              </div>

              <div className="qtyStepper">
                <button className="qtyBtn" onClick={() => setQty(l.id, Math.max(0, l.quantity - 1))}>-</button>
                <span className="qtyCount">{l.quantity}</span>
                <button className="qtyBtn" onClick={() => setQty(l.id, l.quantity + 1)}>+</button>
              </div>

              <div className="cartTotal">{formatINR(l.price_cents * l.quantity)}</div>
            </div>
          ))}

          {lines.length > 0 ? (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-glass)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>Have a promo code?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Enter code (e.g. KHAJA10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
                <button className="btn btnGhost" onClick={applyPromo} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                  Apply
                </button>
              </div>
              {promoMessage ? <div className="mutedSmall" style={{ marginTop: 6, color: discountPercent > 0 ? 'var(--accent-green)' : '#fca5a5' }}>{promoMessage}</div> : null}
            </div>
          ) : null}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Order Payable Summary</h3>
          <div className="totRow">
            <span>Subtotal</span>
            <span>{formatINR(totals.subtotal)}</span>
          </div>

          {totals.discount > 0 ? (
            <div className="totRow" style={{ color: 'var(--accent-green)' }}>
              <span>Promo Discount ({discountPercent}%)</span>
              <span>-{formatINR(totals.discount)}</span>
            </div>
          ) : null}

          <div className="totRow">
            <span>Delivery Fee</span>
            <span>{totals.deliveryFee === 0 ? 'FREE' : formatINR(totals.deliveryFee)}</span>
          </div>
          <div className="totRow">
            <span>Tax (5%)</span>
            <span>{formatINR(totals.tax)}</span>
          </div>
          <div className="totRow totGrand">
            <span>Total Payable</span>
            <span style={{ color: 'var(--brand-primary)' }}>{formatINR(totals.total)}</span>
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="btn" onClick={onGoCheckout} disabled={lines.length === 0}>
              Proceed to checkout →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
