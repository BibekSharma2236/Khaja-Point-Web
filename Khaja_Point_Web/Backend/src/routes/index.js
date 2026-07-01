const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    app: 'Khaja Point',
    service: 'api',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', require('./auth'));
router.use('/menu', require('./menu'));
router.use('/orders', require('./orders'));
router.use('/admin/orders', require('./adminOrders'));
router.use('/', require('./esewa'));
router.get('/pay/esewa/callback', (req, res) => res.status(501).json({ error: 'Esewa callback not implemented in mock mode. Use /pay/esewa/mock instead.' }));

module.exports = router;




