// ─────────────────────────────────────────────────────────────────────────────
// apiPriceFetcher.js  —  Fetches TODAY's live mandi prices from data.gov.in
//
// API:  https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
// Free key: https://data.gov.in/user/me/api-keys
//
// IMPORTANT — Real field names returned by this API:
//   state, district, market, commodity, variety, grade,
//   arrival_date, min_price, max_price, modal_price
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const CACHE_FILE       = path.join(__dirname, 'data', 'api_cache.json');
const RESOURCE_ID      = '9ef84268-d588-465a-a308-a864a43d0070';
const API_HOST         = 'api.data.gov.in';
const LIMIT_PER_PAGE   = 1000;
const MAX_PAGES        = 15;           // 15 × 1000 = up to 15,000 records
const CACHE_HOURS      = 6;            // refresh every 6 hours

// ── Helper: today's date as DD/MM/YYYY ──────────────────────────────────────
function todayString() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// ── Single HTTPS GET ─────────────────────────────────────────────────────────
function httpGet(apiKey, offset, limit) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({
      'api-key': apiKey,
      format:   'json',
      limit:    String(limit),
      offset:   String(offset),
    });

    const reqOptions = {
      hostname: API_HOST,
      path:     `/resource/${RESOURCE_ID}?${qs}`,
      method:   'GET',
      headers:  { Accept: 'application/json', 'User-Agent': 'AgriConnect/2.0' },
    };

    const req = https.request(reqOptions, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        if (res.statusCode === 401) return reject(new Error('API key invalid or expired'));
        if (res.statusCode === 429) return reject(new Error('API rate limit hit — try again later'));
        if (res.statusCode !== 200) return reject(new Error(`API HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('API returned non-JSON response')); }
      });
    });

    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('API timeout after 20s')); });
    req.end();
  });
}

// ── Normalize one API record → our internal format ──────────────────────────
// Real field names from data.gov.in:
//   state, district, market, commodity, variety, grade,
//   arrival_date, min_price, max_price, modal_price
function normalize(r) {
  return {
    state:     String(r.state     || r.State     || '').trim(),
    district:  String(r.district  || r.District  || '').trim(),
    market:    String(r.market    || r.Market    || '').trim(),
    commodity: String(r.commodity || r.Commodity || '').trim(),
    variety:   String(r.variety   || r.Variety   || 'Other').trim(),
    grade:     String(r.grade     || r.Grade     || 'FAQ').trim(),
    date:      String(r.arrival_date || r.Arrival_Date || todayString()).trim(),
    min:       Math.round(parseFloat(r.min_price   || r.Min_Price   || r.min   || 0)),
    max:       Math.round(parseFloat(r.max_price   || r.Max_Price   || r.max   || 0)),
    modal:     Math.round(parseFloat(r.modal_price || r.Modal_Price || r.modal || 0)),
    source:    'live_api',
    file:      'data.gov.in',
  };
}

// ── Cache read — returns null if missing / expired / wrong date ──────────────
function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const saved   = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    const ageHrs  = (Date.now() - (saved.fetchedAt || 0)) / 3_600_000;
    const today   = todayString();

    if (ageHrs > CACHE_HOURS) {
      console.log(`   🕐 API cache is ${ageHrs.toFixed(1)}h old — refreshing`);
      return null;
    }
    // Also discard if the cached data has a different date than today
    // (server might have been running across midnight)
    if (saved.dataDate && saved.dataDate !== today) {
      console.log(`   📅 Cache date ${saved.dataDate} ≠ today ${today} — refreshing`);
      return null;
    }
    console.log(`   ✅ API cache valid: ${saved.records.length} records, ${ageHrs.toFixed(1)}h old`);
    return saved.records;
  } catch {
    return null;
  }
}

function writeCache(records) {
  try {
    // Detect the date from the records themselves
    const dates = records.map(r => r.date).filter(Boolean);
    const dataDate = dates.sort().reverse()[0] || todayString();
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), dataDate, records }));
    console.log(`   💾 API data cached (${records.length} records, date=${dataDate})`);
  } catch (e) {
    console.error('   Cache write error:', e.message);
  }
}

// ── Main fetch ───────────────────────────────────────────────────────────────
async function fetchLivePrices(apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    console.log('   ⚠️  DATA_GOV_API_KEY not set in .env — skipping live API fetch');
    return [];
  }

  // Try cache first
  const cached = readCache();
  if (cached) return cached;

  console.log('   🌐 Connecting to data.gov.in API...');

  try {
    // Page 1 — get total count
    const first  = await httpGet(apiKey, 0, 1);

    // The API can return total in different fields
    const total  = parseInt(first.total || first.count || first.recordsFiltered || '5000', 10);
    console.log(`   📊 API total records available: ${total}`);

    if (total === 0) {
      console.log('   ℹ️  API returned 0 records for today — market may be closed');
      return [];
    }

    const pages     = Math.min(Math.ceil(total / LIMIT_PER_PAGE), MAX_PAGES);
    const allRecs   = [];

    for (let p = 0; p < pages; p++) {
      const offset = p * LIMIT_PER_PAGE;
      process.stdout.write(`   Fetching page ${p + 1}/${pages}...`);
      const result  = await httpGet(apiKey, offset, LIMIT_PER_PAGE);
      const records = result.records || result.data || result.fields || [];
      process.stdout.write(` ${records.length} rows\n`);

      records.forEach(r => {
        const n = normalize(r);
        if (n.state && n.commodity && n.modal > 0) allRecs.push(n);
      });
    }

    if (allRecs.length === 0) {
      console.log('   ⚠️  API returned pages but no valid price records');
      return [];
    }

    console.log(`   ✅ API fetch complete: ${allRecs.length} valid records`);
    writeCache(allRecs);
    return allRecs;

  } catch (err) {
    console.error(`   ❌ API error: ${err.message}`);
    console.log('   ↩️  Falling back to CSV data only');
    return [];
  }
}

// ── Auto-refresh every CACHE_HOURS ──────────────────────────────────────────
function startAutoRefresh(apiKey, onNewData) {
  if (!apiKey) return;
  const ms = CACHE_HOURS * 3_600_000;
  setInterval(async () => {
    console.log('\n🔄 Scheduled API refresh...');
    try { fs.unlinkSync(CACHE_FILE); } catch {}
    const fresh = await fetchLivePrices(apiKey);
    if (fresh.length > 0 && onNewData) onNewData(fresh);
  }, ms);
  console.log(`   ⏰ Live prices will auto-refresh every ${CACHE_HOURS}h`);
}

module.exports = { fetchLivePrices, startAutoRefresh };
