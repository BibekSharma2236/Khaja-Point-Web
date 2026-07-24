import { useMemo, useState } from 'react';
import { api } from '../api';

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

const PRESET_ADDRESSES = [
  'Thamel Marg, Kathmandu',
  'Jhamsikhel, Lalitpur',
  'Durbar Marg, Kathmandu',
  'Patan Durbar Square, Lalitpur',
  'New Road, Kathmandu'
];

export default function Checkout({ cart, onSuccess }) {
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('esewa');
  const [payingModal, setPayingModal] = useState(false);
  const [esewaId, setEsewaId] = useState('');
  const [esewaPin, setEsewaPin] = useState('');
  const [paymentStep, setPaymentStep] = useState('INIT'); // INIT, PROCESS, SUCCESS

  const items = useMemo(() => {
    const map = cart || {};
    return Object.values(map).map((l) => ({ menuItemId: l.id, quantity: l.quantity }));
  }, [cart]);

  const subtotal_cents = useMemo(() => {
    const map = cart || {};
    return Object.values(map).reduce((sum, l) => sum + l.price_cents * l.quantity, 0);
  }, [cart]);

  const delivery_fee_cents = subtotal_cents >= 150000 ? 0 : subtotal_cents === 0 ? 0 : 3000;
  const tax_cents = Math.round(subtotal_cents * 0.05);
  const total_cents = subtotal_cents + delivery_fee_cents + tax_cents;

  async function handleOrderSubmission(e) {
    e.preventDefault();
    if (!deliveryName || !deliveryPhone || !deliveryAddress) {
      setError('Please fill in name, phone, and delivery address.');
      return;
    }

    if (paymentMethod === 'esewa' || paymentMethod === 'khalti') {
      setPayingModal(true);
      setPaymentStep('INIT');
      return;
    }

    // Direct Cash on Delivery
    await executeBackendCheckout();
  }

  async function executeBackendCheckout() {
    setLoading(true);
    setError('');
    try {
      const data = await api.checkout({
        deliveryName,
        deliveryPhone,
        deliveryAddress,
        deliveryInstructions: deliveryInstructions || null,
        items
      });

      if (paymentMethod === 'esewa' || paymentMethod === 'khalti') {
        await api.payEsewa({ orderId: data.orderId, forceFailure: false });
      }

      onSuccess?.({ ...data, paymentMethod });
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
      setPayingModal(false);
    }
  }

  async function processMockDigitalPayment() {
    setPaymentStep('PROCESS');
    setTimeout(async () => {
      setPaymentStep('SUCCESS');
      setTimeout(async () => {
        await executeBackendCheckout();
      }, 1200);
    }, 1500);
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Checkout & Payment</h2>
          <div className="muted">Confirm delivery coordinates and select your digital payment portal</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <form onSubmit={handleOrderSubmission} className="form">
            <div className="sectionHead">
              <div className="sectionTitle">1. Delivery Contact & Address</div>
            </div>

            <label>
              Full Name
              <input
                type="text"
                placeholder="e.g. Aarav Sharma"
                value={deliveryName}
                onChange={(e) => setDeliveryName(e.target.value)}
                required
              />
            </label>

            <label>
              Phone Number
              <input
                type="tel"
                placeholder="98XXXXXXXX"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                required
              />
            </label>

            <label>
              Delivery Location
              <textarea
                placeholder="Street address, house no., landmark..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
              />
            </label>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="mutedSmall" style={{ fontWeight: 700 }}>Quick Presets:</span>
              {PRESET_ADDRESSES.map((addr) => (
                <button
                  type="button"
                  key={addr}
                  className="pill"
                  style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => setDeliveryAddress(addr)}
                >
                  📍 {addr}
                </button>
              ))}
            </div>

            <label>
              Special Delivery Notes (Optional)
              <textarea
                placeholder="e.g. Please leave at front desk, ring doorbell..."
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
              />
            </label>

            <div className="sectionHead" style={{ marginTop: 12 }}>
              <div className="sectionTitle">2. Select Payment Method</div>
            </div>

            <div className="paymentGrid">
              <div
                className={paymentMethod === 'esewa' ? 'paymentCard paymentCardActive' : 'paymentCard'}
                onClick={() => setPaymentMethod('esewa')}
              >
                <div style={{ fontSize: '1.4rem' }}>📲</div>
                <div className="paymentTitle">eSewa</div>
                <div className="mutedSmall">Digital Wallet</div>
              </div>

              <div
                className={paymentMethod === 'khalti' ? 'paymentCard paymentCardActive' : 'paymentCard'}
                onClick={() => setPaymentMethod('khalti')}
              >
                <div style={{ fontSize: '1.4rem' }}>💜</div>
                <div className="paymentTitle">Khalti</div>
                <div className="mutedSmall">Instant Pay</div>
              </div>

              <div
                className={paymentMethod === 'cod' ? 'paymentCard paymentCardActive' : 'paymentCard'}
                onClick={() => setPaymentMethod('cod')}
              >
                <div style={{ fontSize: '1.4rem' }}>💵</div>
                <div className="paymentTitle">COD</div>
                <div className="mutedSmall">Pay later</div>
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div style={{ marginTop: 16 }}>
              <button disabled={loading || items.length === 0} className="btn">
                {loading ? 'Processing Order...' : paymentMethod === 'cod' ? 'Place Order (COD)' : `Pay with ${paymentMethod.toUpperCase()} →`}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Order Summary</h3>
          <div className="totRow">
            <span>Items Subtotal</span>
            <span>{formatINR(subtotal_cents)}</span>
          </div>
          <div className="totRow">
            <span>Delivery Fee</span>
            <span>{delivery_fee_cents === 0 ? 'FREE' : formatINR(delivery_fee_cents)}</span>
          </div>
          <div className="totRow">
            <span>Tax (5%)</span>
            <span>{formatINR(tax_cents)}</span>
          </div>
          <div className="totRow totGrand">
            <span>Total Amount</span>
            <span style={{ color: 'var(--brand-primary)' }}>{formatINR(total_cents)}</span>
          </div>
          <div className="miniNotice" style={{ marginTop: 20 }}>
            🔒 <strong>Guaranteed Safe Delivery:</strong> Your order will be assigned to a dedicated courier with live location telemetry.
          </div>
        </div>
      </div>

      {/* Mock Digital Wallet Payment Modal */}
      {payingModal ? (
        <div className="modalOverlay">
          <div className="modalCard">
            <button className="modalClose" onClick={() => setPayingModal(false)}>✕</button>

            {paymentStep === 'INIT' ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: '2.5rem' }}>{paymentMethod === 'esewa' ? '🟢' : '💜'}</div>
                  <h2 style={{ fontSize: '1.5rem', marginTop: 6 }}>
                    {paymentMethod === 'esewa' ? 'eSewa Payment Portal' : 'Khalti Direct Checkout'}
                  </h2>
                  <div className="mutedSmall">Amount to pay: <strong>{formatINR(total_cents)}</strong></div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Scan QR Code or enter ID</div>
                  <div style={{ width: 120, height: 120, margin: 'auto', background: '#fff', padding: 8, borderRadius: 12 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=KhajaPoint_Order_${total_cents}`}
                      alt="Payment QR"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                </div>

                <div className="form">
                  <label>
                    {paymentMethod.toUpperCase()} ID / Phone
                    <input
                      type="text"
                      placeholder="98XXXXXXXX"
                      value={esewaId}
                      onChange={(e) => setEsewaId(e.target.value)}
                    />
                  </label>
                  <label>
                    MPIN / Password
                    <input
                      type="password"
                      placeholder="••••"
                      value={esewaPin}
                      onChange={(e) => setEsewaPin(e.target.value)}
                    />
                  </label>
                  <button className="btn" onClick={processMockDigitalPayment}>
                    Confirm Payment • {formatINR(total_cents)}
                  </button>
                </div>
              </div>
            ) : null}

            {paymentStep === 'PROCESS' ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>⏳</div>
                <h3 style={{ marginTop: 16 }}>Communicating with Bank Server...</h3>
                <div className="mutedSmall">Verifying transaction signature...</div>
              </div>
            ) : null}

            {paymentStep === 'SUCCESS' ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '3.5rem' }}>✅</div>
                <h3 style={{ marginTop: 12, color: 'var(--accent-green)' }}>Payment Authorized!</h3>
                <div className="mutedSmall">Redirecting to Live Order Tracking...</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
