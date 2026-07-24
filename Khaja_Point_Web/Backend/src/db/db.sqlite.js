const path = require('path');
const sqlite3 = require('sqlite3');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', '..', 'khaja.db');

let dbInstance = null;

function openDb() {
  if (dbInstance) return dbInstance;

  dbInstance = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to connect to sqlite db:', err);
    }
  });

  return dbInstance;
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  const db = openDb();

  await run(db, 'PRAGMA foreign_keys = ON');

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      image_url TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL DEFAULT 'General'
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLACED',
      delivery_name TEXT NOT NULL,
      delivery_phone TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_instructions TEXT,
      subtotal_cents INTEGER NOT NULL,
      delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
      tax_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL,
      courier_lat REAL,
      courier_lng REAL,
      courier_last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  const orderColumns = await all(db, 'PRAGMA table_info(orders)');
  if (!orderColumns.some((column) => column.name === 'courier_lat')) {
    await run(db, 'ALTER TABLE orders ADD COLUMN courier_lat REAL');
  }
  if (!orderColumns.some((column) => column.name === 'courier_lng')) {
    await run(db, 'ALTER TABLE orders ADD COLUMN courier_lng REAL');
  }
  if (!orderColumns.some((column) => column.name === 'courier_last_seen_at')) {
    await run(db, 'ALTER TABLE orders ADD COLUMN courier_last_seen_at TEXT');
  }

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      line_total_cents INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`
  );

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@khajapoint.local';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const bcrypt = require('bcryptjs');

  const existingAdmin = await get(db, 'SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    const hash = await bcrypt.hash(adminPass, 10);
    await run(
      db,
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Khaja Point Admin', adminEmail, hash, 'admin']
    );
  }

  const items = [
    {
      name: 'Chicken Biryani',
      description: 'Aromatic basmati rice cooked with tender marinated chicken and exotic spices.',
      price_cents: 899,
      category: 'Biryani',
      image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Mutton Biryani',
      description: 'Rich mutton biryani slow-cooked with royal traditional herbs.',
      price_cents: 1099,
      category: 'Biryani',
      image_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Veg Biryani',
      description: 'Seasonal garden veggies layered with fragrant basmati rice and saffron.',
      price_cents: 599,
      category: 'Biryani',
      image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Momo Platter',
      description: 'Steamed dumplings served with spicy tomato sesame chutney & soup.',
      price_cents: 499,
      category: 'Momo',
      image_url: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Buff Chowmein',
      description: 'Stir-fried wok noodles with spiced buffalo meat and fresh vegetables.',
      price_cents: 549,
      category: 'Nepali',
      image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Chicken Sekuwa',
      description: 'Smoky wood-grilled chicken skewers served with lemon and spicy achar.',
      price_cents: 649,
      category: 'Nepali BBQ',
      image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Chatamari',
      description: 'Authentic Nepali rice crepe topped with seasoned minced meat and egg.',
      price_cents: 449,
      category: 'Nepali',
      image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Aalu Tama',
      description: 'Classic Nepali bamboo shoot, black-eyed beans, and potato curry soup.',
      price_cents: 399,
      category: 'Nepali',
      image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Samay Baji',
      description: 'Traditional festive platter with beaten rice, spiced meats, wo, and pickles.',
      price_cents: 499,
      category: 'Nepali',
      image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Newari Khaja',
      description: 'Classic Newari snack set featuring choila, bara, baji, and fermented radish.',
      price_cents: 749,
      category: 'Newari',
      image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Thakali Khana',
      description: 'Authentic Thakali thali with aromatic rice, black lentil dal, curry, and gundruk.',
      price_cents: 999,
      category: 'Thakali',
      image_url: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Juju Dhau',
      description: 'Famous Bhaktapur royal sweet curd served in a traditional clay pot finish.',
      price_cents: 249,
      category: 'Desserts',
      image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Sel Roti',
      description: 'Crispy ring-shaped sweetened rice flour bread served warm.',
      price_cents: 199,
      category: 'Breakfast',
      image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Pepperoni Pizza',
      description: 'Artisanal wood-fired crust topped with mozzarella cheese and spicy pepperoni.',
      price_cents: 799,
      category: 'Pizza',
      image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Cheese Burger',
      description: 'Gourmet beef patty with melted cheddar, fresh lettuce, tomatoes, and chef sauce.',
      price_cents: 599,
      category: 'Burgers',
      image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Grilled Sausage',
      description: 'Juicy spiced bratwurst sausages served with mustard dip and potato wedges.',
      price_cents: 399,
      category: 'Starters',
      image_url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Thuppa Bowl',
      description: 'Hearty Himalayan noodle soup cooked in rich savory broth with fresh cilantro.',
      price_cents: 399,
      category: 'Soups',
      image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Sprite',
      description: 'Chilled lemon-lime carbonated soda.',
      price_cents: 100,
      category: 'Beverages',
      image_url: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Coke',
      description: 'Ice-cold classic Coca-Cola.',
      price_cents: 100,
      category: 'Beverages',
      image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Fanta',
      description: 'Crisp and fizzy orange soft drink.',
      price_cents: 100,
      category: 'Beverages',
      image_url: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Red Bull',
      description: 'Refreshing energy drink.',
      price_cents: 299,
      category: 'Beverages',
      image_url: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&auto=format&fit=crop&q=80'
    }
  ];

  for (const it of items) {
    const existing = await get(db, 'SELECT id, image_url FROM menu_items WHERE name = ?', [it.name]);
    if (!existing) {
      await run(
        db,
        'INSERT INTO menu_items (name, description, price_cents, image_url, is_available, category) VALUES (?, ?, ?, ?, 1, ?)',
        [it.name, it.description, it.price_cents, it.image_url, it.category]
      );
    } else if (!existing.image_url || existing.image_url.trim() === '') {
      await run(
        db,
        'UPDATE menu_items SET image_url = ?, description = ? WHERE id = ?',
        [it.image_url, it.description, existing.id]
      );
    }
  }

  return db;
}

module.exports = {
  DB_FILE,
  openDb,
  initDb,
  run,
  get,
  all
};


