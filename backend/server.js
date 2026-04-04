// ─────────────────────────────────────────────────────────────────────────────
// server.js  —  AgriConnect Express API
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

const { store, isPerishable } = require('./priceStore');
const { fetchLivePrices, startAutoRefresh } = require('./apiPriceFetcher');
const { users, farmerListings, buyerPosts } = require('./database');

const app    = express();
const PORT   = parseInt(process.env.PORT || '5000', 10);
const SECRET = process.env.JWT_SECRET || 'agriconnect_dev_secret_changeme';
const APIKEY = (process.env.DATA_GOV_API_KEY || '').trim();

app.use(cors());
app.use(express.json());

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token — please login again' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Only ${role}s can do this` });
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, whatsapp, district, state } = req.body;

    // ── Validate required fields ──
    if (!name?.trim())     return res.status(400).json({ error: 'Full name is required' });
    if (!email?.trim())    return res.status(400).json({ error: 'Email is required' });
    if (!password)         return res.status(400).json({ error: 'Password is required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!role || !['farmer','buyer'].includes(role))
      return res.status(400).json({ error: 'Role must be farmer or buyer' });
    if (!phone?.trim())    return res.status(400).json({ error: 'Phone number is required' });
    if (!district?.trim()) return res.status(400).json({ error: 'District is required' });
    if (!state?.trim())    return res.status(400).json({ error: 'State is required' });

    // ── Extra required for buyers ──
    if (role === 'buyer') {
      const { companyName, companyType, gstNumber } = req.body;
      if (!companyName?.trim()) return res.status(400).json({ error: 'Company name is required for buyers' });
      if (!companyType?.trim()) return res.status(400).json({ error: 'Company type is required' });
    }

    // ── Extra required for farmers ──
    if (role === 'farmer') {
      const { village } = req.body;
      if (!village?.trim()) return res.status(400).json({ error: 'Village/Town name is required' });
    }

    // Check duplicate email
    if (users.findOne(u => u.email.toLowerCase() === email.toLowerCase()))
      return res.status(409).json({ error: 'This email is already registered' });

    const hashed = await bcrypt.hash(password, 10);

    const base = {
      id: uuid(), name: name.trim(), email: email.toLowerCase().trim(),
      password: hashed, role,
      phone: phone.trim(), whatsapp: (whatsapp || phone).trim(),
      district: district.trim(), state: state.trim(),
      createdAt: new Date().toISOString(),
    };

    const extra = role === 'farmer'
      ? {
          village:    (req.body.village || '').trim(),
          cropsGrown: Array.isArray(req.body.cropsGrown) ? req.body.cropsGrown : [],
        }
      : {
          companyName: (req.body.companyName || '').trim(),
          companyType: (req.body.companyType || '').trim(),
          gstNumber:   (req.body.gstNumber   || '').trim(),
          address:     (req.body.address     || '').trim(),
          description: (req.body.description || '').trim(),
          cropsNeeded: Array.isArray(req.body.cropsNeeded) ? req.body.cropsNeeded : [],
          verified:    false,
        };

    const newUser = users.insert({ ...base, ...extra });
    const { password: _, ...safe } = newUser;
    const token = jwt.sign({ id: newUser.id, role: newUser.role }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: safe, token });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = users.findOne(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'No account found with this email' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });

    const { password: _, ...safe } = user;
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ user: safe, token });
  } catch (e) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// ─────────────────────────────────────────────────────────────────────────────
//  METADATA
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/states',      (req, res) => res.json(store.states));
app.get('/api/commodities', (req, res) => res.json(store.commoditiesInState(req.query.state)));
app.get('/api/districts',   (req, res) => res.json(store.districtsInState(req.query.state)));

// GET /api/data-status — shows what data is loaded
app.get('/api/data-status', (req, res) => {
  res.json({
    totalRecords:     store.records.length,
    totalStates:      store.states.length,
    totalCommodities: store.commodities.length,
    latestDate:       store.latestDate(),
    liveAPIEnabled:   !!APIKEY,
    sources:          store.sourceBreakdown(),
    states:           store.states,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  MARKET PRICES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/prices?commodity=Tomato&state=Karnataka
app.get('/api/prices', (req, res) => {
  const { commodity, state } = req.query;
  if (!commodity?.trim()) return res.status(400).json({ error: 'commodity parameter is required' });

  const markets    = store.marketSummary(commodity, state);
  const stats      = store.stats(commodity, state);
  const history    = store.priceHistory(commodity, state);
  const perishable = isPerishable(commodity);

  if (!markets.length) {
    return res.json({ commodity, perishable, markets: [], stats: null, history: [], recommendation: null });
  }

  const best  = markets[0];
  const worst = markets[markets.length - 1];
  const diff  = best.modal - worst.modal;
  const pct   = worst.modal > 0 ? Math.round((diff / worst.modal) * 100) : 0;

  // Trend: compare most-recent 3 months vs earliest 3 months
  const earlyAvg = history.slice(0, 3).reduce((s, m) => s + m.price, 0) / 3;
  const lateAvg  = history.slice(-3).reduce((s, m) => s + m.price, 0) / 3;
  const trend = lateAvg > earlyAvg * 1.05 ? 'rising' : lateAvg < earlyAvg * 0.95 ? 'falling' : 'stable';

  const advice =
    trend === 'rising'
      ? `✅ GOOD TIME TO SELL — Prices are rising. Best market: ${best.market} (${best.district}, ${best.state}) at ₹${best.modal}/Qtl — ₹${diff} more than the lowest market (${pct}% higher).`
    : trend === 'falling'
      ? `⚠️ PRICES FALLING — If you can store safely, wait a few days. If you must sell now, go to ${best.market} (${best.district}) for the best available rate of ₹${best.modal}/Qtl.`
      : `📊 STABLE MARKET — Good time to sell. Best rate at ${best.market} (${best.district}, ${best.state}) = ₹${best.modal}/Qtl, which is ₹${diff} more than the lowest market.`;

  res.json({
    commodity, perishable,
    dataDate:   store.latestDate(),
    dataSource: APIKEY ? 'Live API (data.gov.in / Agmarknet) + CSV' : 'Official CSV (data.gov.in / Agmarknet)',
    liveData:   !!APIKEY,
    markets, stats, history,
    recommendation: { advice, trend, diff, pct, bestMarket: best.market, bestDistrict: best.district, bestState: best.state, bestPrice: best.modal },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  FARMER LISTINGS  (separate collection — farmer_listings.json)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/listings?commodity=Tomato&state=Karnataka
app.get('/api/listings', (req, res) => {
  const { commodity, state, district } = req.query;
  let rows = farmerListings.find(l => l.status === 'active');
  if (commodity) rows = rows.filter(l => l.commodity.toLowerCase().includes(commodity.toLowerCase()));
  if (state)     rows = rows.filter(l => l.state === state);
  if (district)  rows = rows.filter(l => (l.district || '').toLowerCase().includes(district.toLowerCase()));
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(rows);
});

// GET /api/listings/my  — farmer sees their own listings (including deleted)
app.get('/api/listings/my', requireAuth, requireRole('farmer'), (req, res) => {
  const rows = farmerListings.find(l => l.farmerId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(rows);
});

// POST /api/listings  — farmer posts a new listing
app.post('/api/listings', requireAuth, requireRole('farmer'), (req, res) => {
  try {
    const { commodity, quantity, unit, askingPrice } = req.body;
    if (!commodity?.trim()) return res.status(400).json({ error: 'Commodity is required' });
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0)
      return res.status(400).json({ error: 'Valid quantity is required' });
    if (!askingPrice || isNaN(askingPrice) || Number(askingPrice) <= 0)
      return res.status(400).json({ error: 'Valid asking price is required' });

    const farmer  = users.findById(req.user.id);
    // Mandatory contact check
    if (!farmer.phone) return res.status(400).json({ error: 'Please update your phone number in profile before posting' });

    const listing = farmerListings.insert({
      id:             uuid(),
      farmerId:       farmer.id,
      farmerName:     farmer.name,
      farmerPhone:    farmer.phone,
      farmerWhatsapp: farmer.whatsapp || farmer.phone,
      farmerVillage:  farmer.village  || '',
      district:       farmer.district,
      state:          farmer.state,
      commodity:      commodity.trim(),
      variety:        (req.body.variety     || '').trim(),
      quantity:       Number(quantity),
      unit:           unit || 'Qtl',
      askingPrice:    Number(askingPrice),
      isPerishable:   isPerishable(commodity),
      shelfLifeDays:  Number(req.body.shelfLifeDays || 0),
      description:    (req.body.description || '').trim(),
      status:         'active',
      createdAt:      new Date().toISOString(),
    });
    res.status(201).json(listing);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// DELETE /api/listings/:id  — farmer deletes (marks closed) their own listing
app.delete('/api/listings/:id', requireAuth, requireRole('farmer'), (req, res) => {
  const listing = farmerListings.findById(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.farmerId !== req.user.id)
    return res.status(403).json({ error: 'You can only delete your own listings' });
  farmerListings.update(req.params.id, { status: 'closed', closedAt: new Date().toISOString() });
  res.json({ success: true, message: 'Listing closed successfully' });
});

// ─────────────────────────────────────────────────────────────────────────────
//  BUYER POSTS  (separate collection — buyer_posts.json)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/buyer-posts?commodity=Tomato
app.get('/api/buyer-posts', (req, res) => {
  const { commodity } = req.query;
  let rows = buyerPosts.find(b => b.status === 'active');
  if (commodity) {
    rows = rows.filter(b =>
      b.commoditiesNeeded.some(c => c.toLowerCase().includes(commodity.toLowerCase()))
    );
  }
  rows.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0));
  res.json(rows);
});

// GET /api/buyer-posts/my — buyer sees their own posts
app.get('/api/buyer-posts/my', requireAuth, requireRole('buyer'), (req, res) => {
  const rows = buyerPosts.find(b => b.buyerId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(rows);
});

// POST /api/buyer-posts — buyer posts a new requirement
app.post('/api/buyer-posts', requireAuth, requireRole('buyer'), (req, res) => {
  try {
    const { commoditiesNeeded, quantityNeeded, priceOffered, description } = req.body;

    if (!Array.isArray(commoditiesNeeded) || commoditiesNeeded.length === 0)
      return res.status(400).json({ error: 'Select at least one commodity you need' });
    if (!quantityNeeded?.trim())
      return res.status(400).json({ error: 'Quantity needed is required' });
    if (!description?.trim())
      return res.status(400).json({ error: 'Description is required — tell farmers about your requirements' });

    const buyer = users.findById(req.user.id);
    if (!buyer.phone)
      return res.status(400).json({ error: 'Please update your phone number in profile before posting' });

    const post = buyerPosts.insert({
      id:               uuid(),
      buyerId:          buyer.id,
      buyerName:        buyer.companyName || buyer.name,
      buyerPhone:       buyer.phone,
      buyerWhatsapp:    buyer.whatsapp || buyer.phone,
      buyerType:        buyer.companyType || 'Individual Buyer',
      verified:         buyer.verified || false,
      commoditiesNeeded,
      quantityNeeded:   quantityNeeded.trim(),
      priceOffered:     (priceOffered || 'Negotiable').trim(),
      description:      description.trim(),
      state:            (req.body.state || buyer.state || 'All India').trim(),
      status:           'active',
      createdAt:        new Date().toISOString(),
    });
    res.status(201).json(post);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create buyer post' });
  }
});

// DELETE /api/buyer-posts/:id — buyer deletes their own post
app.delete('/api/buyer-posts/:id', requireAuth, requireRole('buyer'), (req, res) => {
  const post = buyerPosts.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.buyerId !== req.user.id)
    return res.status(403).json({ error: 'You can only delete your own posts' });
  buyerPosts.update(req.params.id, { status: 'closed', closedAt: new Date().toISOString() });
  res.json({ success: true, message: 'Post removed successfully' });
});

// ─────────────────────────────────────────────────────────────────────────────
//  UNIFIED SEARCH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ markets: [], listings: [], buyers: [], suggestions: [] });
  const lq = q.toLowerCase();

  res.json({
    markets:     store.marketSummary(q).slice(0, 30),
    listings:    farmerListings.find(l => l.status === 'active' && l.commodity.toLowerCase().includes(lq)),
    buyers:      buyerPosts.find(b => b.status === 'active' && b.commoditiesNeeded.some(c => c.toLowerCase().includes(lq))),
    suggestions: store.commodities.filter(c => c.toLowerCase().includes(lq)).slice(0, 10),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/dashboard', requireAuth, (req, res) => {
  if (req.user.role === 'farmer') {
    const myListings = farmerListings.find(l => l.farmerId === req.user.id);
    res.json({
      role:             'farmer',
      myActiveListings: myListings.filter(l => l.status === 'active').length,
      myTotalListings:  myListings.length,
      totalBuyerPosts:  buyerPosts.find(b => b.status === 'active').length,
      totalMarkets:     new Set(store.records.map(r => r.market)).size,
      totalRecords:     store.records.length,
      totalStates:      store.states.length,
      totalCommodities: store.commodities.length,
      dataDate:         store.latestDate(),
      liveAPI:          !!APIKEY,
    });
  } else {
    const myPosts = buyerPosts.find(b => b.buyerId === req.user.id);
    res.json({
      role:           'buyer',
      myActivePosts:  myPosts.filter(b => b.status === 'active').length,
      myTotalPosts:   myPosts.length,
      totalListings:  farmerListings.find(l => l.status === 'active').length,
      totalFarmers:   users.find(u => u.role === 'farmer').length,
      totalRecords:   store.records.length,
      dataDate:       store.latestDate(),
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log('\n' + '═'.repeat(60));
  console.log('  🌾  AgriConnect Backend  v2.0');
  console.log('═'.repeat(60));
  console.log(`  URL         : http://localhost:${PORT}`);
  console.log(`  CSV Records : ${store.records.length}`);
  console.log(`  States      : ${store.states.length}`);
  console.log(`  Commodities : ${store.commodities.length}`);
  console.log(`  Live API    : ${APIKEY ? '✅ Enabled — will fetch from data.gov.in' : '❌ Not set  (add DATA_GOV_API_KEY to .env)'}`);
  console.log(`  DB folder   : backend/data/db/`);
  console.log(`  CSV folder  : backend/data/csv/`);
  console.log('─'.repeat(60));
  console.log('  Demo  farmer@demo.com / demo123');
  console.log('  Demo  company@demo.com / demo123');
  console.log('═'.repeat(60) + '\n');

  // Fetch live API data after server is ready (non-blocking)
  if (APIKEY) {
    console.log('🌐 Starting live API fetch...');
    const live = await fetchLivePrices(APIKEY);
    if (live.length > 0) {
      store.mergeAPIData(live);
      startAutoRefresh(APIKEY, fresh => store.mergeAPIData(fresh));
    }
  }
});
