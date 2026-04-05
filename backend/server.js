// server.js  —  AgriConnect API with MySQL database
'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

// ── Database modules (MySQL) ──────────────────────────────────────────────────
const Users      = require('./data/db/users');
const Listings   = require('./data/db/listings');
const BuyerPosts = require('./data/db/buyerPosts');

// ── Market price data (CSV + live API) ───────────────────────────────────────
const { store, isPerishable } = require('./priceStore');
const { fetchLivePrices, startAutoRefresh } = require('./apiPriceFetcher');

const app    = express();
const PORT   = parseInt(process.env.PORT || '5000');
const SECRET = process.env.JWT_SECRET || 'agriconnect_dev_secret_changeme';
const APIKEY = (process.env.DATA_GOV_API_KEY || '').trim();

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired session — please login again' }); }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role)
      return res.status(403).json({ error: `Only ${role}s can do this` });
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH ROUTES  —  data stored in MySQL `users` table
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, whatsapp,
            district, state, village,
            company_name, company_type, gst_number, address,
            description, crops_grown, crops_needed,
            companyName, companyType, gstNumber, cropsGrown, cropsNeeded } = req.body;

    // ── Validate ──
    if (!name?.trim())     return res.status(400).json({ error: 'Full name is required' });
    if (!email?.trim())    return res.status(400).json({ error: 'Email is required' });
    if (!password)         return res.status(400).json({ error: 'Password is required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!['farmer','buyer'].includes(role))
      return res.status(400).json({ error: 'Role must be farmer or buyer' });
    if (!phone?.trim())    return res.status(400).json({ error: 'Phone number is required' });
    if (!district?.trim()) return res.status(400).json({ error: 'District is required' });
    if (!state?.trim())    return res.status(400).json({ error: 'State is required' });

    // ── Check duplicate ──
    const existing = await Users.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'This email is already registered' });

    // ── Hash password ──
    const hashed = await bcrypt.hash(password, 10);

    // ── Build user object ──
    const newUser = await Users.insertUser({
      id:           uuid(),
      name:         name.trim(),
      email:        email.toLowerCase().trim(),
      password:     hashed,
      role,
      phone:        phone.trim(),
      whatsapp:     (whatsapp || phone).trim(),
      district:     district.trim(),
      state:        state.trim(),
      // farmer fields
      village:      village?.trim() || null,
      crops_grown:  Array.isArray(crops_grown) ? crops_grown : (Array.isArray(cropsGrown) ? cropsGrown : []),
      // buyer fields
      company_name: company_name?.trim() || companyName?.trim() || null,
      company_type: company_type?.trim() || companyType?.trim() || null,
      gst_number:   gst_number?.trim()   || gstNumber?.trim()   || null,
      address:      address?.trim()       || null,
      description:  description?.trim()  || null,
      crops_needed: Array.isArray(crops_needed) ? crops_needed : (Array.isArray(cropsNeeded) ? cropsNeeded : []),
      verified:     false,
    });

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

    const user = await Users.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'No account found with this email' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });

    const { password: _, ...safe } = user;
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ user: safe, token });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safe } = user;
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  MARKET PRICE METADATA  (from CSV / live API — not in MySQL)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/states',      (req, res) => res.json(store.states));
app.get('/api/commodities', (req, res) => res.json(store.commoditiesInState(req.query.state)));
app.get('/api/districts',   (req, res) => res.json(store.districtsInState(req.query.state)));

app.get('/api/data-status', (req, res) => {
  res.json({
    totalRecords:     store.records.length,
    totalStates:      store.states.length,
    totalCommodities: store.commodities.length,
    latestDate:       store.latestDate(),
    liveAPIEnabled:   !!APIKEY,
    sources:          store.sourceBreakdown(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  MARKET PRICES  (from CSV / live API — not in MySQL)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/prices', (req, res) => {
  const { commodity, state } = req.query;
  if (!commodity?.trim()) return res.status(400).json({ error: 'commodity is required' });

  const markets    = store.marketSummary(commodity, state);
  const stats      = store.stats(commodity, state);
  const history    = store.priceHistory(commodity, state);
  const perishable = isPerishable(commodity);

  if (!markets.length)
    return res.json({ commodity, perishable, markets: [], stats: null, history: [], recommendation: null });

  const best  = markets[0];
  const worst = markets[markets.length - 1];
  const diff  = best.modal - worst.modal;
  const pct   = worst.modal > 0 ? Math.round((diff / worst.modal) * 100) : 0;

  const earlyAvg = history.slice(0,3).reduce((s,m)=>s+m.price,0)/3;
  const lateAvg  = history.slice(-3).reduce((s,m)=>s+m.price,0)/3;
  const trend = lateAvg > earlyAvg*1.05 ? 'rising' : lateAvg < earlyAvg*0.95 ? 'falling' : 'stable';

  let advice = '';
  if (trend === 'rising')
    advice = `✅ GOOD TIME TO SELL — Prices are rising. Best market is ${best.market} (${best.district}, ${best.state}) at ₹${best.modal}/Qtl — ₹${diff} more than the lowest market.`;
  else if (trend === 'falling')
    advice = `⚠️ PRICES FALLING — If you can store safely, wait a few days. Otherwise sell at ${best.market} (${best.district}) for ₹${best.modal}/Qtl.`;
  else
    advice = `📊 MARKET STABLE — Good time to sell. Best price at ${best.market} (${best.district}, ${best.state}) = ₹${best.modal}/Qtl, which is ₹${diff} more than the lowest market.`;

  res.json({
    commodity, perishable,
    dataDate:   store.latestDate(commodity, state),
    dataSource: APIKEY ? 'Live API (data.gov.in) + CSV Files' : 'Official CSV Data (data.gov.in)',
    markets, stats, history,
    recommendation: { advice, trend, diff, pct, bestMarket: best.market, bestDistrict: best.district, bestState: best.state, bestPrice: best.modal },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  FARMER LISTINGS  —  stored in MySQL `farmer_listings` table
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/listings
app.get('/api/listings', async (req, res) => {
  try {
    const { commodity, state, district } = req.query;
    const listings = await Listings.getListings({ commodity, state, district });
    res.json(listings);
  } catch (e) {
    console.error('Get listings error:', e);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

// POST /api/listings  — farmer posts a crop for sale
app.post('/api/listings', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const { commodity, variety, quantity, unit, askingPrice, shelfLifeDays, description } = req.body;

    if (!commodity?.trim()) return res.status(400).json({ error: 'Commodity is required' });
    if (!quantity || isNaN(quantity) || quantity <= 0)
      return res.status(400).json({ error: 'Valid quantity is required' });
    if (!askingPrice || isNaN(askingPrice) || askingPrice <= 0)
      return res.status(400).json({ error: 'Valid asking price is required' });

    // Get farmer details from MySQL
    const farmer = await Users.findById(req.user.id);
    if (!farmer) return res.status(404).json({ error: 'Farmer account not found' });

    const listing = await Listings.insertListing({
      id:             uuid(),
      farmerId:       farmer.id,
      farmerName:     farmer.name,
      farmerPhone:    farmer.phone,
      farmerWhatsapp: farmer.whatsapp || farmer.phone,
      farmerVillage:  farmer.village  || '',
      district:       farmer.district,
      state:          farmer.state,
      commodity:      commodity.trim(),
      variety:        variety?.trim() || null,
      quantity:       Number(quantity),
      unit:           unit || 'Qtl',
      askingPrice:    Number(askingPrice),
      isPerishable:   isPerishable(commodity),
      shelfLifeDays:  Number(shelfLifeDays || 0),
      description:    description?.trim() || null,
    });

    res.status(201).json(listing);
  } catch (e) {
    console.error('Post listing error:', e);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// DELETE /api/listings/:id  — farmer closes their listing
app.delete('/api/listings/:id', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const ok = await Listings.closeListing(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ error: 'Listing not found or not yours' });
    res.json({ success: true, message: 'Listing closed successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to close listing' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  BUYER POSTS  —  stored in MySQL `buyer_posts` table
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/buyer-posts
app.get('/api/buyer-posts', async (req, res) => {
  try {
    const posts = await BuyerPosts.getPosts({ commodity: req.query.commodity });
    res.json(posts);
  } catch (e) {
    console.error('Get buyer posts error:', e);
    res.status(500).json({ error: 'Failed to load buyer posts' });
  }
});

// GET /api/buyer-posts/my  — buyer's own posts
app.get('/api/buyer-posts/my', requireAuth, requireRole('buyer'), async (req, res) => {
  try {
    const posts = await BuyerPosts.getByBuyer(req.user.id);
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load your posts' });
  }
});

// POST /api/buyer-posts  — buyer posts a requirement
app.post('/api/buyer-posts', requireAuth, requireRole('buyer'), async (req, res) => {
  try {
    const { commoditiesNeeded, quantityNeeded, priceOffered, description, state } = req.body;

    if (!Array.isArray(commoditiesNeeded) || commoditiesNeeded.length === 0)
      return res.status(400).json({ error: 'Select at least one commodity you need' });
    if (!quantityNeeded?.trim())
      return res.status(400).json({ error: 'Quantity needed is required' });
    if (!description?.trim())
      return res.status(400).json({ error: 'Please describe your requirements' });

    const buyer = await Users.findById(req.user.id);
    if (!buyer) return res.status(404).json({ error: 'Buyer account not found' });

    const post = await BuyerPosts.insertPost({
      id:               uuid(),
      buyerId:          buyer.id,
      buyerName:        buyer.company_name || buyer.name,
      buyerPhone:       buyer.phone,
      buyerWhatsapp:    buyer.whatsapp || buyer.phone,
      buyerType:        buyer.company_type || 'Individual Buyer',
      verified:         buyer.verified || false,
      commoditiesNeeded,
      quantityNeeded:   quantityNeeded.trim(),
      priceOffered:     priceOffered?.trim() || 'Negotiable',
      description:      description.trim(),
      state:            state?.trim() || buyer.state || 'All India',
    });

    res.status(201).json(post);
  } catch (e) {
    console.error('Post buyer post error:', e);
    res.status(500).json({ error: 'Failed to create requirement post' });
  }
});

// DELETE /api/buyer-posts/:id
app.delete('/api/buyer-posts/:id', requireAuth, requireRole('buyer'), async (req, res) => {
  try {
    const ok = await BuyerPosts.closePost(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ error: 'Post not found or not yours' });
    res.json({ success: true, message: 'Post removed successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove post' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  UNIFIED SEARCH
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ markets: [], listings: [], buyers: [], suggestions: [] });

  try {
    const [listings, buyers] = await Promise.all([
      Listings.searchListings(q),
      BuyerPosts.searchPosts(q),
    ]);
    res.json({
      markets:     store.marketSummary(q).slice(0, 30),
      listings,
      buyers,
      suggestions: store.commodities.filter(c => c.toLowerCase().includes(q.toLowerCase())).slice(0, 10),
    });
  } catch (e) {
    console.error('Search error:', e);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'farmer') {
      const [myListings, totalBuyerPosts] = await Promise.all([
        Listings.getByFarmer(req.user.id),
        BuyerPosts.countActive(),
      ]);
      res.json({
        role:             'farmer',
        myActiveListings: myListings.filter(l => l.status === 'active').length,
        myTotalListings:  myListings.length,
        totalBuyerPosts,
        totalMarkets:     new Set(store.records.map(r => r.market)).size,
        totalRecords:     store.records.length,
        totalStates:      store.states.length,
        totalCommodities: store.commodities.length,
        dataDate:         store.latestDate(),
        liveAPI:          !!APIKEY,
      });
    } else {
      const [myPosts, totalListings, totalFarmers] = await Promise.all([
        BuyerPosts.getByBuyer(req.user.id),
        Listings.countActive(),
        Users.countFarmers(),
      ]);
      res.json({
        role:          'buyer',
        myActivePosts: myPosts.filter(p => p.status === 'active').length,
        myTotalPosts:  myPosts.length,
        totalListings,
        totalFarmers,
        totalRecords:  store.records.length,
        dataDate:      store.latestDate(),
      });
    }
  } catch (e) {
    console.error('Dashboard error:', e);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log('\n' + '═'.repeat(60));
  console.log('  🌾  AgriConnect Backend  v3.0  (MySQL Edition)');
  console.log('═'.repeat(60));
  console.log(`  URL         : http://localhost:${PORT}`);
  console.log(`  Database    : MySQL via XAMPP`);
  console.log(`  CSV Records : ${store.records.length}`);
  console.log(`  States      : ${store.states.length}`);
  console.log(`  Commodities : ${store.commodities.length}`);
  console.log(`  Live API    : ${APIKEY ? '✅ Enabled' : '❌ Not configured'}`);
  console.log('─'.repeat(60));
  console.log('  Demo  farmer@demo.com / demo123');
  console.log('  Demo  company@demo.com / demo123');
  console.log('  phpMyAdmin : http://localhost/phpmyadmin');
  console.log('═'.repeat(60) + '\n');

  if (APIKEY) {
    const live = await fetchLivePrices(APIKEY);
    if (live.length > 0) {
      store.mergeAPIData(live);
      startAutoRefresh(APIKEY, fresh => store.mergeAPIData(fresh));
    }
  }
});
