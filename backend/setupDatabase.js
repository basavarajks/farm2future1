// setupDatabase.js
// ─────────────────────────────────────────────────────────────────────────────
// Run this ONCE to create the database, all tables, and demo data
// Command:  node setupDatabase.js
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_NAME = process.env.DB_NAME || 'agriconnect';

async function setup() {
  // First connect WITHOUT selecting a database (so we can CREATE it)
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  console.log('\n🌾 AgriConnect — Database Setup\n' + '─'.repeat(50));

  // ── 1. Create database ────────────────────────────────────────────────────
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`✅ Database '${DB_NAME}' ready`);

  await conn.query(`USE \`${DB_NAME}\``);

  // ── 2. Create USERS table ─────────────────────────────────────────────────
  // Stores both farmers and buyers/companies
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           VARCHAR(36)  PRIMARY KEY,
      name         VARCHAR(200) NOT NULL,
      email        VARCHAR(200) NOT NULL UNIQUE,
      password     VARCHAR(255) NOT NULL,
      role         ENUM('farmer','buyer') NOT NULL,
      phone        VARCHAR(20)  NOT NULL,
      whatsapp     VARCHAR(20),
      district     VARCHAR(100) NOT NULL,
      state        VARCHAR(100) NOT NULL,

      -- Farmer-only fields
      village      VARCHAR(100),
      crops_grown  TEXT,           -- JSON array stored as text

      -- Buyer/Company-only fields
      company_name  VARCHAR(200),
      company_type  VARCHAR(100),
      gst_number    VARCHAR(20),
      address       TEXT,
      description   TEXT,
      crops_needed  TEXT,          -- JSON array stored as text
      verified      TINYINT(1) DEFAULT 0,

      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_email (email),
      INDEX idx_role  (role),
      INDEX idx_state (state)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table: users');

  // ── 3. Create FARMER_LISTINGS table ───────────────────────────────────────
  // Stores crops posted for sale by farmers
  await conn.query(`
    CREATE TABLE IF NOT EXISTS farmer_listings (
      id              VARCHAR(36)  PRIMARY KEY,
      farmer_id       VARCHAR(36)  NOT NULL,
      farmer_name     VARCHAR(200) NOT NULL,
      farmer_phone    VARCHAR(20)  NOT NULL,
      farmer_whatsapp VARCHAR(20),
      farmer_village  VARCHAR(100),
      district        VARCHAR(100) NOT NULL,
      state           VARCHAR(100) NOT NULL,

      commodity       VARCHAR(200) NOT NULL,
      variety         VARCHAR(100),
      quantity        DECIMAL(10,2) NOT NULL,
      unit            VARCHAR(20)  NOT NULL DEFAULT 'Qtl',
      asking_price    DECIMAL(10,2) NOT NULL,
      is_perishable   TINYINT(1)   DEFAULT 0,
      shelf_life_days INT          DEFAULT 0,
      description     TEXT,

      status          ENUM('active','closed','sold') DEFAULT 'active',
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      closed_at       DATETIME,

      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_commodity (commodity),
      INDEX idx_state     (state),
      INDEX idx_status    (status),
      INDEX idx_farmer    (farmer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table: farmer_listings');

  // ── 4. Create BUYER_POSTS table ───────────────────────────────────────────
  // Stores crop requirements posted by buyers/companies
  await conn.query(`
    CREATE TABLE IF NOT EXISTS buyer_posts (
      id              VARCHAR(36)  PRIMARY KEY,
      buyer_id        VARCHAR(36),
      buyer_name      VARCHAR(200) NOT NULL,
      buyer_phone     VARCHAR(20)  NOT NULL,
      buyer_whatsapp  VARCHAR(20),
      buyer_type      VARCHAR(100),
      verified        TINYINT(1)   DEFAULT 0,

      commodities_needed TEXT NOT NULL,   -- JSON array stored as text
      quantity_needed    VARCHAR(200),
      price_offered      VARCHAR(200),
      description        TEXT NOT NULL,
      state              VARCHAR(100) DEFAULT 'All India',

      status      ENUM('active','closed') DEFAULT 'active',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      closed_at   DATETIME,

      INDEX idx_buyer_id (buyer_id),
      INDEX idx_status   (status),
      INDEX idx_state    (state)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table: buyer_posts');

  // ── 5. Seed demo users ────────────────────────────────────────────────────
  const [existingUsers] = await conn.query('SELECT COUNT(*) as cnt FROM users');
  if (existingUsers[0].cnt === 0) {
    const farmerPass = await bcrypt.hash('demo123', 10);
    const buyerPass  = await bcrypt.hash('demo123', 10);

    await conn.query(`
      INSERT INTO users
        (id, name, email, password, role, phone, whatsapp, district, state, village, crops_grown)
      VALUES
        ('u_demo_farmer', 'Ramesh Kumar', 'farmer@demo.com', ?, 'farmer',
         '9876543210', '9876543210', 'Belagavi', 'Karnataka', 'Shiraguppi',
         '["Tomato","Onion","Chilli"]')
    `, [farmerPass]);

    await conn.query(`
      INSERT INTO users
        (id, name, email, password, role, phone, whatsapp, district, state,
         company_name, company_type, gst_number, address, description, crops_needed, verified)
      VALUES
        ('u_demo_buyer', 'FreshMart Foods Pvt Ltd', 'company@demo.com', ?, 'buyer',
         '9988776655', '9988776655', 'Bengaluru Urban', 'Karnataka',
         'FreshMart Foods Pvt Ltd', 'Food Processing', '29AABCF1234D1Z5',
         '45 Industrial Area, Peenya, Bengaluru',
         'We process and export vegetables. Looking for bulk suppliers.',
         '["Tomato","Onion","Potato"]', 1)
    `, [buyerPass]);

    console.log('✅ Demo users seeded (farmer@demo.com / company@demo.com — password: demo123)');
  } else {
    console.log('⏭  Users already exist — skipping seed');
  }

  // ── 6. Seed demo farmer listings ─────────────────────────────────────────
  const [existingListings] = await conn.query('SELECT COUNT(*) as cnt FROM farmer_listings');
  if (existingListings[0].cnt === 0) {
    await conn.query(`
      INSERT INTO farmer_listings
        (id, farmer_id, farmer_name, farmer_phone, farmer_whatsapp, farmer_village,
         district, state, commodity, variety, quantity, unit, asking_price,
         is_perishable, shelf_life_days, description, status)
      VALUES
        ('fl_demo_1', 'u_demo_farmer', 'Ramesh Kumar', '9876543210', '9876543210',
         'Shiraguppi', 'Belagavi', 'Karnataka', 'Tomato', 'Hybrid',
         50, 'Qtl', 1800, 1, 3,
         'Fresh Grade A tomatoes, harvested this morning. Immediate sale needed.',
         'active'),

        ('fl_demo_2', 'u_demo_farmer', 'Suresh Patil', '9844001122', '9844001122',
         'Kalaghatagi', 'Dharwad', 'Karnataka', 'Onion', 'Red Medium',
         200, 'Qtl', 1500, 0, 30,
         'Red onion, medium size, well dried, ready for transport.',
         'active')
    `);
    console.log('✅ Demo farmer listings seeded');
  } else {
    console.log('⏭  Farmer listings already exist — skipping seed');
  }

  // ── 7. Seed demo buyer posts ──────────────────────────────────────────────
  const [existingPosts] = await conn.query('SELECT COUNT(*) as cnt FROM buyer_posts');
  if (existingPosts[0].cnt === 0) {
    await conn.query(`
      INSERT INTO buyer_posts
        (id, buyer_id, buyer_name, buyer_phone, buyer_whatsapp, buyer_type, verified,
         commodities_needed, quantity_needed, price_offered, description, state, status)
      VALUES
        ('bp_demo_1', 'u_demo_buyer', 'FreshMart Foods Pvt Ltd', '9988776655', '9988776655',
         'Food Processing Company', 1,
         '["Tomato","Onion","Potato"]', '500 Qtl/month', 'Market rate + 5%',
         'Regular bulk buyer. Advance payment guaranteed. We arrange transport from your farm.',
         'Karnataka', 'active'),

        ('bp_demo_2', NULL, 'Agro Spice Industries Ltd', '9977665544', '9977665544',
         'Spice Industry', 1,
         '["Green Chilli","Turmeric","Ginger(Green)","Coriander"]',
         '1000 Qtl/month', '₹5000 - ₹8000 per Qtl',
         'Spice processing plant. Long-term contracts available. Quality grading at our facility.',
         'Karnataka', 'active'),

        ('bp_demo_3', NULL, 'Karnataka Starch & Chemicals', '9966554433', '9966554433',
         'Processing Industry', 1,
         '["Potato","Maize","Sorghum"]',
         '2000 Qtl/month', 'Market rate + 5% premium',
         'Industrial starch manufacturer. Farm gate pickup available. Weigh slip provided.',
         'Karnataka', 'active'),

        ('bp_demo_4', NULL, 'BigBasket Fresh Procurement', '9900887766', '9900887766',
         'Retail Chain', 1,
         '["Tomato","Onion","Cabbage","Cauliflower","Beans","Carrot"]',
         '100 - 5000 Qtl/month', 'Market rate',
         'Online grocery platform. Need Grade A produce with consistent supply. Pan-India sourcing.',
         'All India', 'active')
    `);
    console.log('✅ Demo buyer posts seeded');
  } else {
    console.log('⏭  Buyer posts already exist — skipping seed');
  }

  await conn.end();

  console.log('\n' + '─'.repeat(50));
  console.log('🎉 Database setup complete!');
  console.log('   You can now run: npm run dev');
  console.log('   View your data at: http://localhost/phpmyadmin');
  console.log('   Database name: ' + DB_NAME);
  console.log('─'.repeat(50) + '\n');
}

setup().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  console.error('\nMake sure:');
  console.error('  1. XAMPP is running (Apache + MySQL both green)');
  console.error('  2. Your .env file exists with correct DB settings');
  console.error('  3. MySQL port is 3306 (default XAMPP setting)');
  process.exit(1);
});
