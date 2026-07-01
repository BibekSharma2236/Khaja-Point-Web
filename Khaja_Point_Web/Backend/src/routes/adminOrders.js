const express = require('express');
const { z } = require('zod');
const { openDb, all, get, run } = require('../db/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const createOrderSchema = z.object({
  userEmail: z.string().email(),
  deliveryName: z.string().min(2),
  deliveryPhone: z.string().min(6),
  deliveryAddress: z.string().min(5),
  deliveryInstructions: z.string().optional().nullable(),
  status: z.string().optional().default('PLACED'),
  items: z
    .array(z.object({ menuItemId: z.number().int().positive(), quantity: z.number().int().positive().max(50) }))
    .min(1)
});

const allowedStatuses = [
  'PLACED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'CONFIRMED',
  'PREPARING',
  'ASSIGNED',
  'PICKING_UP',
  'ON_THE_WAY',
  'ARRIVED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
];

async function computeOrderTotals(db, items) {
  let subtotal_cents = 0;
  const orderLines = [];

  for (const item of items) {
    const menuItem = await get(db, 'SELECT id, name, price_cents FROM menu_items WHERE id = ? AND is_available = 1', [item.menuItemId]);
    if (!menuItem) {
      const err = new Error(`Menu item not found: ${item.menuItemId}`);
      err.statusCode = 400;
      throw err;
    }
    const lineTotal = menuItem.price_cents * item.quantity;
    subtotal_cents += lineTotal;
    orderLines.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      unit_price_cents: menuItem.price_cents,
      quantity: item.quantity,
      line_total_cents: lineTotal
    });
  }

  const delivery_fee_cents = subtotal_cents >= 150000 ? 0 : 3000;
  const tax_cents = Math.round(subtotal_cents * 0.05);
  const total_cents = subtotal_cents + delivery_fee_cents + tax_cents;

  return { orderLines, subtotal_cents, delivery_fee_cents, tax_cents, total_cents };
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = openDb();
    const orders = await all(
      db,
      `SELECT o.id, o.status, o.created_at, o.total_cents, o.delivery_phone, o.delivery_address,
              o.courier_lat, o.courier_lng, u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC`,
      []
    );
    return res.json({ orders });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load admin orders' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = createOrderSchema.parse(req.body);
    if (!allowedStatuses.includes(body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = openDb();
    const user = await get(db, 'SELECT id FROM users WHERE email = ?', [body.userEmail]);
    if (!user) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { orderLines, subtotal_cents, delivery_fee_cents, tax_cents, total_cents } = await computeOrderTotals(db, body.items);

    await run(db, 'BEGIN');
    const orderResult = await run(
      db,
      `INSERT INTO orders (
        user_id, status, delivery_name, delivery_phone, delivery_address, delivery_instructions,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        body.status,
        body.deliveryName,
        body.deliveryPhone,
        body.deliveryAddress,
        body.deliveryInstructions || null,
        subtotal_cents,
        delivery_fee_cents,
        tax_cents,
        total_cents
      ]
    );

    const orderId = orderResult.lastID;
    for (const line of orderLines) {
      await run(
        db,
        `INSERT INTO order_items (order_id, menu_item_id, name, unit_price_cents, quantity, line_total_cents)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, line.menu_item_id, line.name, line.unit_price_cents, line.quantity, line.line_total_cents]
      );
    }

    await run(db, 'COMMIT');
    return res.status(201).json({ ok: true, orderId });
  } catch (e) {
    try {
      const db = openDb();
      await run(db, 'ROLLBACK');
    } catch (_) {}
    const status = e?.statusCode || 400;
    return res.status(status).json({ error: e?.message || 'Failed to create order' });
  }
});

router.delete('/:orderId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    const db = openDb();
    const order = await get(db, 'SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await run(db, 'DELETE FROM orders WHERE id = ?', [orderId]);
    return res.json({ ok: true, orderId });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
