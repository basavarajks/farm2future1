// ─────────────────────────────────────────────────────────────────────────────
// priceStore.js  —  Manages all mandi price data (CSV + live API merged)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const { loadAllCSV } = require('./csvLoader');

// Load CSV at startup
let _records = loadAllCSV();

// ── Merge live API records into the store ────────────────────────────────────
function mergeAPIData(apiRecords) {
  if (!Array.isArray(apiRecords) || apiRecords.length === 0) return;

  // Key = market + commodity + date  — API data wins over CSV if same key
  const map = new Map();
  // Load CSV first (lower priority)
  _records.forEach(r => map.set(`${r.market}||${r.commodity}||${r.date}`, r));
  // API data overwrites CSV for same key (higher priority = fresher)
  let newCount = 0;
  apiRecords.forEach(r => {
    if (r.state && r.commodity && r.modal > 0) {
      const k = `${r.market}||${r.commodity}||${r.date}`;
      if (!map.has(k)) newCount++;
      map.set(k, r);
    }
  });

  _records = Array.from(map.values());
  console.log(`   🔀 Merged: ${_records.length} total records (+${newCount} new from API)`);
  _rebuildIdx();
}

// ── Indexes (rebuilt after every merge) ──────────────────────────────────────
let _states      = [];
let _commodities = [];
let _stateDistr  = {};

function _rebuildIdx() {
  _states      = [...new Set(_records.map(r => r.state).filter(Boolean))].sort();
  _commodities = [...new Set(_records.map(r => r.commodity).filter(Boolean))].sort();
  _stateDistr  = {};
  _records.forEach(r => {
    if (!_stateDistr[r.state]) _stateDistr[r.state] = new Set();
    _stateDistr[r.state].add(r.district);
  });
}
_rebuildIdx();

// ── Public accessors ──────────────────────────────────────────────────────────
const store = {
  get records()     { return _records; },
  get states()      { return _states; },
  get commodities() { return _commodities; },

  mergeAPIData,

  // All rows matching commodity (fuzzy), optionally filtered by state
  query(commodity, state) {
    const lq = (commodity || '').toLowerCase().trim();
    let r = _records.filter(x => x.commodity.toLowerCase().includes(lq));
    if (state && state !== 'All States') r = r.filter(x => x.state === state);
    return r;
  },

  // Best price per market (deduped, sorted highest first)
  marketSummary(commodity, state) {
    const rows = this.query(commodity, state);
    const map  = {};
    rows.forEach(r => {
      const k = `${r.market}||${r.state}`;
      if (!map[k] || r.modal > map[k].modal) map[k] = r;
    });
    return Object.values(map).sort((a, b) => b.modal - a.modal);
  },

  // Stats for a commodity
  stats(commodity, state) {
    const rows = this.query(commodity, state);
    if (!rows.length) return null;
    const m = rows.map(r => r.modal);
    return {
      min:   Math.min(...m),
      max:   Math.max(...m),
      avg:   Math.round(m.reduce((s, v) => s + v, 0) / m.length),
      count: rows.length,
    };
  },

  // Commodities available in a state
  commoditiesInState(state) {
    if (!state || state === 'All States') return _commodities;
    return [...new Set(_records.filter(r => r.state === state).map(r => r.commodity))].sort();
  },

  // Districts in a state
  districtsInState(state) {
    return state && _stateDistr[state] ? [..._stateDistr[state]].sort() : [];
  },

  // Latest date across all records (chronological sort)
  latestDate(commodity, state) {
    const rows = commodity ? this.query(commodity, state) : _records;
    const dates = rows.map(r => r.date).filter(Boolean);
    if (dates.length === 0) return 'N/A';

    dates.sort((a, b) => {
      const pA = a.split(/[-/]/);
      const pB = b.split(/[-/]/);
      if (pA.length === 3 && pB.length === 3) {
        // Compare Year
        if (pA[2] !== pB[2]) return parseInt(pA[2], 10) - parseInt(pB[2], 10);
        // Compare Month
        if (pA[1] !== pB[1]) return parseInt(pA[1], 10) - parseInt(pB[1], 10);
        // Compare Day
        return parseInt(pA[0], 10) - parseInt(pB[0], 10);
      }
      return a.localeCompare(b);
    });
    return dates[dates.length - 1];
  },

  // Breakdown by source file
  sourceBreakdown() {
    const out = {};
    _records.forEach(r => { out[r.file || r.source] = (out[r.file || r.source] || 0) + 1; });
    return out;
  },

  // Simulated 12-month price history based on current avg
  priceHistory(commodity, state) {
    const rows = this.query(commodity, state);
    if (!rows.length) return [];
    const avg = rows.reduce((s, r) => s + r.modal, 0) / rows.length;
    return ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']
      .map((month, i) => ({
        month,
        price: Math.max(50, Math.round(avg * (1 + Math.sin((i / 12) * Math.PI * 2) * 0.18 + (Math.random() - 0.5) * 0.10))),
        year:  i >= 9 ? 2026 : 2025,
      }));
  },
};

// ── Perishable commodity list ─────────────────────────────────────────────────
const PERISHABLE = new Set([
  'Tomato','Spinach','Coriander','Brinjal','Beans','Cabbage','Cauliflower',
  'Bhindi(Ladies Finger)','Ladies Finger','Green Chilli','Amaranthus',
  'Methi(Leaves)','Drumstick','Banana','Mushroom','Peas Wet',
  'Pointed gourd(Parval)','Snakeguard','Ridgeguard(Tori)','Bottle gourd',
  'Sponge gourd','Bitter gourd','Capsicum','Guar','Cucumbar(Kheera)',
]);

function isPerishable(commodity) {
  const lc = (commodity || '').toLowerCase();
  for (const p of PERISHABLE) {
    if (lc.includes(p.toLowerCase()) || p.toLowerCase().startsWith(lc.split('(')[0].trim())) return true;
  }
  return false;
}

module.exports = { store, isPerishable };
