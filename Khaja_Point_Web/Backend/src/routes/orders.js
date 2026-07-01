const express = require('express');
const { z } = require('zod');

const { openDb, all, get, run } = require('../db/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { emitOrderUpdate, emitCourierLocation } = require('../socket');

const router = express.Router();

const checkoutSchema = z.object({
  deliveryName: z.string().min(2),
  deliveryPhone: z.string().min(6),
  deliveryAddress: z.string().min(5),
  deliveryInstructions: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().positive().max(50)
      })
    )
    .min(1)
});

const locationSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180)
});

const orderStatuses = [
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

function centsToInt(n) {
  return Math.round(Number(n));
}

async function computeTotals(db, items) {
  const orderLines = [];
  let subtotal_cents = 0;

  for (const it of items) {
    const menuItem = await get(db, 'SELECT id, name, price_cents FROM menu_items WHERE id = ? AND is_available = 1', [it.menuItemId]);
    if (!menuItem) {
      const err = new Error(`Menu item not found: ${it.menuItemId}`);
      err.statusCode = 400;
      throw err;
    }

    const quantity = it.quantity;
    const line_total_cents = menuItem.price_cents * quantity;
    subtotal_cents += line_total_cents;
    orderLines.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      unit_price_cents: menuItem.price_cents,
      quantity,
      line_total_cents
    });
  }

  const delivery_fee_cents = subtotal_cents >= 150000 ? 0 : subtotal_cents === 0 ? 0 : 3000;
  const tax_cents = Math.round(subtotal_cents * 0.05);
  const total_cents = subtotal_cents + delivery_fee_cents + tax_cents;

  return { orderLines, subtotal_cents, delivery_fee_cents, tax_cents, total_cents };
}

function buildTrackingResponse(order, items) {
  const courier_location = order.courier_lat && order.courier_lng ? {
    lat: order.courier_lat,
    lng: order.courier_lng,
    updated_at: order.courier_last_seen_at || order.updated_at
  } : null;

  const eta_minutes = (() => {
    switch (order.status) {
      case 'DELIVERED':
        return 0;
      case 'OUT_FOR_DELIVERY':
      case 'ON_THE_WAY':
        return 12;
      case 'PICKING_UP':
        return 18;
      case 'ASSIGNED':
        return 22;
      case 'PREPARING':
        return 30;
      default:
        return 45;
    }
  })();

  return {
    order: {
      id: order.id,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      total_cents: order.total_cents,
      delivery_address: order.delivery_address,
      delivery_name: order.delivery_name,
      delivery_phone: order.delivery_phone,
      delivery_instructions: order.delivery_instructions
    },
    items,
    courier_location,
    eta_minutes,
    status_timeline: orderStatuses.map((status) => ({ status, done: orderStatuses.indexOf(status) <= orderStatuses.indexOf(order.status) }))
  };
}

async function getOrderIfOwned(db, orderId, userId) {
  return get(
    db,
    'SELECT id, status, created_at, updated_at, delivery_name, delivery_phone, delivery_address, delivery_instructions, subtotal_cents, delivery_fee_cents, tax_cents, total_cents, courier_lat, courier_lng, courier_last_seen_at FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId]
  );
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const db = openDb();

    const { orderLines, subtotal_cents, delivery_fee_cents, tax_cents, total_cents } = await computeTotals(db, body.items);

    await run(db, 'BEGIN');
    const orderResult = await run(
      db,
      `INSERT INTO orders (
        user_id, status,
        delivery_name, delivery_phone, delivery_address, delivery_instructions,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents
      ) VALUES (?, 'PLACED', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        body.deliveryName,
        body.deliveryPhone,
        body.deliveryAddress,
        body.deliveryInstructions || null,
        centsToInt(subtotal_cents),
        centsToInt(delivery_fee_cents),
        centsToInt(tax_cents),
        centsToInt(total_cents)
      ]
    );

    const orderId = orderResult.lastID;

    for (const line of orderLines) {
      await run(
        db,
        `INSERT INTO order_items (
          order_id, menu_item_id, name, unit_price_cents, quantity, line_total_cents
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, line.menu_item_id, line.name, line.unit_price_cents, line.quantity, line.line_total_cents]
      );
    }

    await run(db, 'COMMIT');

    return res.status(201).json({
      orderId,
      status: 'PLACED',
      totals: { subtotal_cents, delivery_fee_cents, tax_cents, total_cents }
    });
  } catch (e) {
    try {
      const db = openDb();
      await run(db, 'ROLLBACK');
    } catch (_) {
      // ignore
    }

    const status = e?.statusCode || 400;
    return res.status(status).json({ error: e?.message || 'Checkout failed' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const db = openDb();
    const orders = await all(
      db,
      'SELECT id, status, created_at, total_cents FROM orders WHERE user_id = ? ORDER BY id DESC',
      [req.user.userId]
    );
    return res.json({ orders });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/:orderId', requireAuth, async (req, res) => {
  try {
    const db = openDb();
    const orderId = Number(req.params.orderId);

    const order = await getOrderIfOwned(db, orderId, req.user.userId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = await all(
      db,
      'SELECT menu_item_id, name, unit_price_cents, quantity, line_total_cents FROM order_items WHERE order_id = ?',
      [orderId]
    );

    return res.json({ order, items });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load order' });
  }
});

router.get('/:orderId/tracking', requireAuth, async (req, res) => {
  try {
    const db = openDb();
    const orderId = Number(req.params.orderId);

    const order = await getOrderIfOwned(db, orderId, req.user.userId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = await all(
      db,
      'SELECT menu_item_id, name, unit_price_cents, quantity, line_total_cents FROM order_items WHERE order_id = ?',
      [orderId]
    );

    return res.json(buildTrackingResponse(order, items));
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load tracking' });
  }
});

router.patch('/:orderId/courier-location', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = locationSchema.parse(req.body);
    const db = openDb();
    const orderId = Number(req.params.orderId);

    const order = await get(db, 'SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await run(
      db,
      'UPDATE orders SET courier_lat = ?, courier_lng = ?, courier_last_seen_at = datetime(\'now\') WHERE id = ?',
      [body.lat, body.lng, orderId]
    );

    emitCourierLocation({ orderId, courier_location: { lat: body.lat, lng: body.lng } });
    return res.json({ ok: true, orderId, courier_location: body });
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'Failed to update courier location' });
  }
});

router.patch('/:orderId/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = openDb();
    const orderId = Number(req.params.orderId);
    const nextStatus = req.body?.status;

    if (!orderStatuses.includes(nextStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await run(
      db,
      'UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [nextStatus, orderId]
    );

    emitOrderUpdate({ orderId, status: nextStatus });
    return res.json({ ok: true, orderId, status: nextStatus });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;


