const express = require('express');
const { z } = require('zod');
const { openDb, run } = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { emitOrderUpdate } = require('../socket');

const router = express.Router();

const esewaMockSchema = z.object({
  forceFailure: z.boolean().optional().default(false)
});

async function processEsewaPayment(req, res) {
  try {
    const { orderId } = req.params;
    const id = Number(orderId);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid orderId' });

    const body = esewaMockSchema.parse(req.body || {});
    const db = openDb();

    const order = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, user_id, status FROM orders WHERE id = ? AND user_id = ?',
        [id, req.user.userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const nextStatus = body.forceFailure ? 'PAYMENT_FAILED' : 'PAYMENT_SUCCESS';
    await run(db, 'UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [nextStatus, id]);

    emitOrderUpdate({ orderId: id, status: nextStatus });

    return res.json({
      ok: true,
      orderId: id,
      payment: {
        provider: 'esewa',
        mode: 'mock',
        status: body.forceFailure ? 'FAILED' : 'SUCCESS'
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Esewa payment failed' });
  }
}

router.post('/orders/:orderId/pay/esewa/mock', requireAuth, processEsewaPayment);
router.post('/orders/:orderId/pay/esewa', requireAuth, processEsewaPayment);

module.exports = router;

