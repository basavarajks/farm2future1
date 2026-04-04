// ─────────────────────────────────────────────────────────────────────────────
// csvLoader.js  —  Loads ALL CSV files from /backend/data/csv/
//
// DROP any number of CSV files into that folder and restart.
// Handles official Agmarknet format with column names like:
//   State, District, Market, Commodity, Variety, Grade,
//   Arrival_Date, Min_x0020_Price, Max_x0020_Price, Modal_x0020_Price
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const fs   = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, 'data', 'csv');

// Ensure folder exists
if (!fs.existsSync(CSV_DIR)) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
}

// ── CSV line splitter (handles quoted commas) ──────────────────────────────
function splitLine(line) {
  const cols = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

// ── Find column index flexibly (handles spaces encoded as _x0020_) ─────────
function findIdx(header, candidates) {
  for (const name of candidates) {
    const i = header.findIndex(h =>
      h.replace(/_x0020_/g, ' ').replace(/\s+/g, '').toLowerCase() ===
      name.replace(/\s+/g, '').toLowerCase()
    );
    if (i !== -1) return i;
  }
  return -1;
}

// ── Parse one CSV file ──────────────────────────────────────────────────────
function parseFile(filePath) {
  const text  = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const rawHeader = splitLine(lines[0]);
  const header    = rawHeader.map(h => h.trim());

  const I = {
    state:     findIdx(header, ['State']),
    district:  findIdx(header, ['District']),
    market:    findIdx(header, ['Market']),
    commodity: findIdx(header, ['Commodity']),
    variety:   findIdx(header, ['Variety']),
    grade:     findIdx(header, ['Grade']),
    date:      findIdx(header, ['Arrival_Date', 'ArrivalDate', 'Date']),
    min:       findIdx(header, ['Min_x0020_Price', 'Min Price', 'MinPrice', 'Min']),
    max:       findIdx(header, ['Max_x0020_Price', 'Max Price', 'MaxPrice', 'Max']),
    modal:     findIdx(header, ['Modal_x0020_Price', 'Modal Price', 'ModalPrice', 'Modal']),
  };

  const fname = path.basename(filePath);
  const rows  = [];

  for (let i = 1; i < lines.length; i++) {
    const c = splitLine(lines[i]);
    if (c.length < 8) continue;
    const modal = Math.round(parseFloat(c[I.modal]) || 0);
    const state = (c[I.state] || '').trim();
    const comm  = (c[I.commodity] || '').trim();
    if (!state || !comm || modal <= 0) continue;

    rows.push({
      state,
      district:  (c[I.district] || '').trim(),
      market:    (c[I.market]   || '').trim(),
      commodity: comm,
      variety:   (c[I.variety]  || 'Other').trim(),
      grade:     (c[I.grade]    || 'FAQ').trim(),
      date:      (c[I.date]     || '').trim(),
      min:       Math.round(parseFloat(c[I.min])   || 0),
      max:       Math.round(parseFloat(c[I.max])   || 0),
      modal,
      source:    'csv',
      file:      fname,
    });
  }
  return rows;
}

// ── Load and merge all CSV files ────────────────────────────────────────────
function loadAllCSV() {
  const files = fs.readdirSync(CSV_DIR).filter(f => f.toLowerCase().endsWith('.csv'));

  if (files.length === 0) {
    console.warn('⚠️  /backend/data/csv/ has no CSV files. Prices will be empty until you add one.');
    return [];
  }

  let all = [];
  files.forEach(f => {
    try {
      const rows = parseFile(path.join(CSV_DIR, f));
      all = all.concat(rows);
      console.log(`   📄 CSV  ${f}  →  ${rows.length} records`);
    } catch (e) {
      console.error(`   ❌ Failed to load ${f}: ${e.message}`);
    }
  });

  // Deduplicate: keep one row per (market + commodity + date)
  const seen = new Set();
  const deduped = all.filter(r => {
    const k = `${r.market}||${r.commodity}||${r.date}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  console.log(`   ✅ CSV total: ${all.length} rows  →  ${deduped.length} after dedupe`);
  return deduped;
}

module.exports = { loadAllCSV };
