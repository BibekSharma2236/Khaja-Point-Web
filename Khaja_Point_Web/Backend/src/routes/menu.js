const express = require('express');
const { openDb, all, get, run } = require('../db/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = openDb();
    const items = await all(
      db,
      'SELECT id, name, description, price_cents, image_url, category, is_available FROM menu_items WHERE is_available = 1 ORDER BY category, name'
    );

    const featuredPlaces = [
      {
        name: 'The Yellow House',
        city: 'Kathmandu',
        type: 'Cafe',
        description: 'A cozy café known for Nepali coffee, pastries, and a relaxed garden setting.',
        specialty: 'Coffee & brunch'
      },
      {
        name: 'Bhoj House',
        city: 'Kathmandu',
        type: 'Restaurant',
        description: 'Traditional Nepali kitchen serving thakali meals, momo, and local favorites.',
        specialty: 'Thakali & momo'
      },
      {
        name: 'Newa Kitchen',
        city: 'Bhaktapur',
        type: 'Restaurant',
        description: 'A cultural dining spot where you can enjoy Newari delicacies and festive platters.',
        specialty: 'Newari cuisine'
      },
      {
        name: 'Bhaktapur Brew',
        city: 'Bhaktapur',
        type: 'Cafe',
        description: 'An artsy café serving fresh brews, teas, and light snacks near the old town.',
        specialty: 'Tea & desserts'
      },
      {
        name: 'Lalitpur Lounge',
        city: 'Lalitpur',
        type: 'Cafe',
        description: 'A modern cafe with rooftop views, local snacks, and evening coffee sessions.',
        specialty: 'Coffee & views'
      },
      {
        name: 'Patan Heritage Eatery',
        city: 'Lalitpur',
        type: 'Restaurant',
        description: 'A heritage-style restaurant highlighting Patan flavors and seasonal specials.',
        specialty: 'Local heritage dishes'
      }
    ];

    const grouped = items.reduce((acc, it) => {
      const cat = it.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        id: it.id,
        name: it.name,
        description: it.description,
        price_cents: it.price_cents,
        image_url: it.image_url,
        category: it.category,
        is_available: it.is_available
      });
      return acc;
    }, {});

    return res.json({ categories: grouped, featuredPlaces });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load menu' });
  }
});

router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = openDb();
    const items = await all(
      db,
      'SELECT id, name, description, price_cents, image_url, category, is_available FROM menu_items ORDER BY id DESC'
    );
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch all admin menu items' });
  }
});

router.post('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, price_cents, image_url, category, is_available } = req.body;
    if (!name || price_cents === undefined) {
      return res.status(400).json({ error: 'Name and price_cents are required' });
    }
    const db = openDb();
    const result = await run(
      db,
      'INSERT INTO menu_items (name, description, price_cents, image_url, category, is_available) VALUES (?, ?, ?, ?, ?, ?)',
      [
        name,
        description || '',
        Number(price_cents),
        image_url || '',
        category || 'General',
        is_available === undefined ? 1 : Number(is_available)
      ]
    );
    return res.status(201).json({ ok: true, id: result.lastID });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create menu item' });
  }
});

router.put('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, price_cents, image_url, category, is_available } = req.body;
    const db = openDb();
    await run(
      db,
      'UPDATE menu_items SET name = ?, description = ?, price_cents = ?, image_url = ?, category = ?, is_available = ? WHERE id = ?',
      [name, description, Number(price_cents), image_url, category, Number(is_available), id]
    );
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update menu item' });
  }
});

router.patch('/admin/:id/toggle', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = openDb();
    const existing = await get(db, 'SELECT is_available FROM menu_items WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Menu item not found' });
    const nextVal = existing.is_available === 1 ? 0 : 1;
    await run(db, 'UPDATE menu_items SET is_available = ? WHERE id = ?', [nextVal, id]);
    return res.json({ ok: true, is_available: nextVal });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

router.delete('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = openDb();
    await run(db, 'DELETE FROM menu_items WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = openDb();
    const item = await get(db, 'SELECT id, name, description, price_cents, image_url, category, is_available FROM menu_items WHERE id = ? AND is_available = 1', [id]);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    return res.json({ item });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load menu item' });
  }
});

module.exports = router;
