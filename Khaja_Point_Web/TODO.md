# TODO - Esewa UI + Mock Integration

## Step 1: Understand existing checkout/order flow
- Inspect `Frontend/src/pages/Checkout.jsx`
- Inspect `Backend/src/routes/orders.js`

## Step 2: Plan UI updates for payment
- Add payment method selection (Esewa + COD/Pay later optional)
- Add a dedicated payment screen/state for Esewa
- Add “Redirecting/Processing payment…” UI with order summary

## Step 3: Backend mock payment endpoints
- Add `POST /api/orders/:orderId/pay/esewa/mock` to mark payment success/failure
- Add new order statuses: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`
- Keep admin status updates working

## Step 4: Frontend payment call wiring
- After placing order, call mock endpoint when user selects Esewa
- Navigate to Orders/Track order with updated status

## Step 5: Update UI timeline
- Update `Frontend/src/pages/Orders.jsx` and `Frontend/src/pages/TrackOrder.jsx` to include payment statuses

## Step 6: Test manually
- Place order with Esewa
- Confirm status timeline shows payment success
- Verify failure state UI (optional toggle for demo)

