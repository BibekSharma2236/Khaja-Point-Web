const express = require('express');

const { openDb, all, get } = require('../db/db');

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

    // group by category
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

