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
      description: 'Aromatic basmati rice with tender chicken.',
      price_cents: 89900,
      category: 'Biryani',
      image_url: ''
    },
    {
      name: 'Mutton Biryani',
      description: 'Rich mutton biryani with traditional spices.',
      price_cents: 109900,
      category: 'Biryani',
      image_url: ''
    },
    {
      name: 'Veg Biryani',
      description: 'Seasonal veggies with fragrant basmati rice.',
      price_cents: 59900,
      category: 'Biryani',
      image_url: ''
    },
    {
      name: 'Momo Platter',
      description: 'Steamed dumplings served with spicy tomato chutney.',
      price_cents: 49900,
      category: 'Momo',
      image_url: ''
    },
    {
      name: 'Buff Chowmein',
      description: 'Stir-fried noodles with spiced buffalo meat and vegetables.',
      price_cents: 54900,
      category: 'Nepali',
      image_url: ''
    },
    {
      name: 'Chicken Sekuwa',
      description: 'Smoky grilled chicken skewers with tangy achar.',
      price_cents: 64900,
      category: 'Nepali BBQ',
      image_url: ''
    },
    {
      name: 'Chatamari',
      description: 'Thin rice crepe topped with seasoned vegetables and egg.',
      price_cents: 44900,
      category: 'Nepali',
      image_url: ''
    },
    {
      name: 'Aalu Tama',
      description: 'Classic Nepali potato and bamboo shoot curry.',
      price_cents: 39900,
      category: 'Nepali',
      image_url: ''
    },
    {
      name: 'Samay Baji',
      description: 'Traditional festive platter with beaten rice, potatoes, and pickles.',
      price_cents: 49900,
      category: 'Nepali',
      image_url: ''
    },
    {
      name: 'Newari Khaja',
      description: 'Classic Newari snack set with bara, wo, and choila.',
      price_cents: 74900,
      category: 'Newari',
      image_url: ''
    },
    {
      name: 'Thakali Khana',
      description: 'Hearty thakali meal with rice, curry, and pickles.',
      price_cents: 89900,
      category: 'Thakali',
      image_url: ''
    },
    {
      name: 'Juju Dhau',
      description: 'Traditional Kathmandu yogurt dessert with a creamy finish.',
      price_cents: 24900,
      category: 'Desserts',
      image_url: ''
    },
    {
      name: 'Sel Roti',
      description: 'Sweet Nepali ring bread served warm with tea.',
      price_cents: 19900,
      category: 'Breakfast',
      image_url: ''
    },
    {
      name: 'Pepperoni Pizza',
      description: 'Crispy base topped with cheese and pepperoni.',
      price_cents: 79900,
      category: 'Pizza',
      image_url: ''
    },
    {
      name: 'Cheese Burger',
      description: 'Juicy burger with cheese, lettuce, and sauce.',
      price_cents: 59900,
      category: 'Burgers',
      image_url: ''
    },
    {
      name: 'Grilled Sausage',
      description: 'Spiced sausage served with a smoky glaze.',
      price_cents: 39900,
      category: 'Starters',
      image_url: ''
    },
    {
      name: 'Thuppa Bowl',
      description: 'Warm lentil soup with fresh herbs and spice.',
      price_cents: 39900,
      category: 'Soups',
      image_url: ''
    },
    {
      name: 'Sprite',
      description: 'Chilled lemon-lime soft drink.',
      price_cents: 1900,
      category: 'Beverages',
      image_url: ''
    },
    {
      name: 'Coke',
      description: 'Classic cola served cold.',
      price_cents: 1900,
      category: 'Beverages',
      image_url: ''
    },
    {
      name: 'Fanta',
      description: 'Refreshing orange soda.',
      price_cents: 1900,
      category: 'Beverages',
      image_url: ''
    },
    {
      name: 'Red Bull',
      description: 'Energy drink for a quick boost.',
      price_cents: 29900,
      category: 'Beverages',
      image_url: ''
    }
  ];

  for (const it of items) {
    const existing = await get(db, 'SELECT id FROM menu_items WHERE name = ?', [it.name]);
    if (!existing) {
      await run(
        db,
        'INSERT INTO menu_items (name, description, price_cents, image_url, is_available, category) VALUES (?, ?, ?, ?, 1, ?)',
        [it.name, it.description, it.price_cents, it.image_url, it.category]
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


