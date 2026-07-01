import { useMemo, useState } from 'react';
import { api } from '../api';

function formatINR(cents) {
  const rupees = cents / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export default function Checkout({ cart, onSuccess }) {
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('esewa');
  const [paying, setPaying] = useState(false);
  const [payStepError, setPayStepError] = useState('');
  const [lastOrderId, setLastOrderId] = useState(null);


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

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setPayStepError('');
    setLoading(true);
    setPaying(false);
    setLastOrderId(null);

    try {
      const data = await api.checkout({
        deliveryName,
        deliveryPhone,
        deliveryAddress,
        deliveryInstructions: deliveryInstructions || null,
        items
      });

      setLastOrderId(data?.orderId);

      if (paymentMethod === 'esewa') {
        setPaying(true);
        const payResult = await api.payEsewa({ orderId: data.orderId, forceFailure: false });
        if (!payResult?.ok) throw new Error('Esewa payment failed');
      }

      onSuccess?.({ ...data, paymentMethod });
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
      setPaying(false);
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h2>Checkout</h2>
          <div className="muted">Confirm delivery details</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <form onSubmit={onSubmit} className="form">
            <label>
              Name
              <input value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)} required />
            </label>
            <label>
              Phone
              <input value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} required />
            </label>
            <label>
              Address
              <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required />
            </label>
            <label>
              Delivery Instructions (optional)
              <textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} />
            </label>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 900, opacity: 0.95 }}>Payment method</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={paymentMethod === 'esewa' ? 'chip chipActive' : 'chip'}
                  onClick={() => setPaymentMethod('esewa')}
                >
                  Esewa (Mock)
                </button>
                <button
                  type="button"
                  className={paymentMethod === 'cod' ? 'chip chipActive' : 'chip'}
                  onClick={() => setPaymentMethod('cod')}
                >
                  Cash on Delivery
                </button>
              </div>
              {paymentMethod === 'esewa' ? (
                <div className="mutedSmall">
                  Demo mode: payment instantly updates order status as SUCCESS.
                </div>
              ) : (
                <div className="mutedSmall">Demo mode: order will remain as PLACED until admin confirms.</div>
              )}
            </div>

            {error ? <div className="error">{error}</div> : null}
            {payStepError ? <div className="error">{payStepError}</div> : null}
            {lastOrderId ? <div className="mutedSmall">Last order: #{lastOrderId}</div> : null}


            <button disabled={loading || paying || items.length === 0}>
              {paying ? 'Processing Esewa payment...' : loading ? 'Placing order...' : 'Place order'}
            </button>
          </form>

        </div>

        <div className="card">
          <h3>Payable</h3>
          <div className="totRow">
            <span>Subtotal</span>
            <span>{formatINR(subtotal_cents)}</span>
          </div>
          <div className="totRow">
            <span>Delivery Fee</span>
            <span>{formatINR(delivery_fee_cents)}</span>
          </div>
          <div className="totRow">
            <span>Tax (5%)</span>
            <span>{formatINR(tax_cents)}</span>
          </div>
          <div className="totRow totGrand">
            <span>Total</span>
            <span>{formatINR(total_cents)}</span>
          </div>
          <div className="muted">Orders are tracked after placing.</div>
        </div>
      </div>
    </div>
  );
}

