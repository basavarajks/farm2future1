import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../utils/api';

export default function Prices() {
  const [states, setStates] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // cards | table

  // Load states on mount
  useEffect(() => {
    api.get('/states').then(r => setStates(['All States', ...r.data]));
    api.get('/commodities').then(r => {
      setCommodities(r.data);
      setSelectedCommodity(r.data[0] || '');
    });
  }, []);

  // When state changes, reload commodity list
  useEffect(() => {
    const params = selectedState !== 'All States' ? `?state=${encodeURIComponent(selectedState)}` : '';
    api.get(`/commodities${params}`).then(r => {
      setCommodities(r.data);
      if (!r.data.includes(selectedCommodity)) setSelectedCommodity(r.data[0] || '');
    });
  }, [selectedState]);

  const fetchPrices = useCallback(() => {
    if (!selectedCommodity) return;
    setLoading(true);
    const stateParam = selectedState !== 'All States' ? `&state=${encodeURIComponent(selectedState)}` : '';
    api.get(`/prices?commodity=${encodeURIComponent(selectedCommodity)}${stateParam}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [selectedCommodity, selectedState]);

  useEffect(() => { if (selectedCommodity) fetchPrices(); }, [fetchPrices]);

  // Filter commodity list by search
  const filtered = commodities.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <h1>📊 Real Market Prices</h1>
          <p style={{ maxWidth: 600 }}>
            Live official mandi prices from <strong style={{ color: 'var(--green-300)' }}>8,000+ market records</strong> across{' '}
            <strong style={{ color: 'var(--green-300)' }}>24 states</strong> and{' '}
            <strong style={{ color: 'var(--green-300)' }}>217 crops</strong> — sourced from{' '}
            <strong style={{ color: 'var(--green-300)' }}>data.gov.in / Agmarknet</strong>.
          </p>
          {data && (
            <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
              {[
                ['📅', 'Data Date', data.dataDate],
                ['🏪', 'Markets Found', data.markets.length],
                ['📦', 'Avg Price', data.stats ? `₹${data.stats.avg}/Qtl` : '—'],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 18px' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-200)' }}>{icon} {label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container page" style={{ paddingTop: 0 }}>
        {/* ─── FILTERS ─── */}
        <div className="card mb-28">
          <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">🗺️ Filter by State</label>
              <select className="form-input" value={selectedState} onChange={e => setSelectedState(e.target.value)}>
                {states.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">🔍 Search Commodity</label>
              <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to filter crops..." />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              🌾 Select Commodity
              <span style={{ fontWeight: 400, color: 'var(--ink-400)', marginLeft: 8 }}>({filtered.length} available)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, maxHeight: 180, overflowY: 'auto', padding: '4px 0' }}>
              {filtered.map(crop => (
                <button key={crop} onClick={() => setSelectedCommodity(crop)} style={{
                  padding: '6px 14px', borderRadius: '100px', fontSize: 13, cursor: 'pointer', transition: '0.15s',
                  border: selectedCommodity === crop ? '2px solid var(--green-500)' : '1.5px solid var(--sand-300)',
                  background: selectedCommodity === crop ? 'var(--green-50)' : 'var(--white)',
                  color: selectedCommodity === crop ? 'var(--green-700)' : 'var(--ink-700)',
                  fontWeight: selectedCommodity === crop ? 700 : 400,
                }}>{crop}</button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="loader">
            <div className="spinner"/>
            <span>Fetching official mandi data...</span>
          </div>
        )}

        {!loading && data && data.markets.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No data found</h3>
            <p>No market records for <strong>{selectedCommodity}</strong>{selectedState !== 'All States' ? ` in ${selectedState}` : ''}. Try another state or commodity.</p>
          </div>
        )}

        {!loading && data && data.markets.length > 0 && (
          <>
            {/* Perishable Warning */}
            {data.perishable && (
              <div className="perishable-banner">
                <div className="perishable-banner-icon">⚡</div>
                <div>
                  <h4>Perishable Crop — Sell Quickly!</h4>
                  <p>{selectedCommodity} lasts only 2-3 days. Prioritize the closest high-price market or call a buyer directly from the Buyers page.</p>
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className="recommendation-box">
              <h3>🤖 Smart Sell Recommendation</h3>
              <p>{data.recommendation?.advice}</p>
              <div className="rec-stats">
                <div className="rec-stat">
                  <span className="rec-stat-label">Best Price</span>
                  <span className="rec-stat-value">₹{data.recommendation?.bestPrice}/Qtl</span>
                </div>
                <div className="rec-stat">
                  <span className="rec-stat-label">Best Market</span>
                  <span className="rec-stat-value" style={{ fontSize: 15, marginTop: 6 }}>{data.recommendation?.bestMarket}</span>
                </div>
                <div className="rec-stat">
                  <span className="rec-stat-label">Extra vs Lowest</span>
                  <span className="rec-stat-value">+₹{data.recommendation?.diff}/Qtl</span>
                </div>
                <div className="rec-stat">
                  <span className="rec-stat-label">Trend</span>
                  <span className={`rec-stat-value ${data.recommendation?.trend === 'rising' ? 'trend-up' : data.recommendation?.trend === 'falling' ? 'trend-down' : 'trend-stable'}`} style={{ fontSize: 15, marginTop: 6 }}>
                    {data.recommendation?.trend === 'rising' ? '↗ Rising' : data.recommendation?.trend === 'falling' ? '↘ Falling' : '→ Stable'}
                  </span>
                </div>
              </div>
            </div>

            {/* State Price Summary */}
            {data.stats && (
              <div className="grid-4 mb-28">
                {[
                  { label: 'Highest Price', val: `₹${data.stats.max}`, icon: '📈', color: 'var(--green-50)', accent: 'var(--green-600)' },
                  { label: 'Average Price', val: `₹${data.stats.avg}`, icon: '📊', color: 'var(--blue-100)', accent: '#1d4ed8' },
                  { label: 'Lowest Price', val: `₹${data.stats.min}`, icon: '📉', color: '#fff7ed', accent: '#c2410c' },
                  { label: 'Markets Tracked', val: data.markets.length, icon: '🏪', color: '#f3e8ff', accent: '#6d28d9' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ background: s.color, border: 'none', padding: '18px 20px' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: s.accent }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{s.label} per Quintal</div>
                  </div>
                ))}
              </div>
            )}

            {/* View Toggle */}
            <div className="flex items-center justify-between mb-16">
              <div className="section-title" style={{ fontSize: 20 }}>
                {selectedCommodity} — All Markets
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-400)', marginLeft: 10 }}>
                  {selectedState !== 'All States' ? selectedState : 'All States'} • {data.dataDate} • Official Data
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setViewMode('cards')} className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}>⊞ Cards</button>
                <button onClick={() => setViewMode('table')} className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}>☰ Table</button>
              </div>
            </div>

            {/* CARDS VIEW */}
            {viewMode === 'cards' && (
              <div className="grid-3 mb-32">
                {data.markets.map((item, i) => (
                  <div className={`price-card ${i === 0 ? 'best' : ''}`} key={`${item.market}-${i}`}>
                    <div className="market-name">{item.market}</div>
                    <div className="market-district">📍 {item.district}, {item.state}</div>
                    {item.variety && item.variety !== 'Other' && (
                      <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
                        Variety: {item.variety} • Grade: {item.grade}
                      </div>
                    )}
                    <div style={{ marginTop: 12 }}>
                      <div className="price-modal">₹{item.modal}</div>
                      <div className="price-range">Range: ₹{item.min} – ₹{item.max}</div>
                    </div>
                    {i === 0 && <div style={{ marginTop: 10 }}><span className="badge badge-green">⭐ Best Price</span></div>}
                    {i === data.markets.length - 1 && data.markets.length > 1 && (
                      <div style={{ marginTop: 10 }}>
                        <span className="badge badge-amber">Lowest Price</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              <div className="card mb-32" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: 'var(--green-900)', color: 'var(--white)' }}>
                        {['#','Market','District','State','Variety','Grade','Min ₹','Max ₹','Modal ₹'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.markets.map((item, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'var(--white)' : 'var(--sand-100)', borderBottom: '1px solid var(--sand-200)' }}>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-400)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>{item.market}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-500)' }}>{item.district}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-500)' }}>{item.state}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-400)', fontSize: 12 }}>{item.variety}</td>
                          <td style={{ padding: '10px 14px' }}><span className="badge badge-green" style={{ fontSize: 11 }}>{item.grade}</span></td>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-500)' }}>₹{item.min}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-500)' }}>₹{item.max}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: i === 0 ? 'var(--green-600)' : 'var(--ink-900)', fontSize: 15 }}>₹{item.modal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-400)', borderTop: '1px solid var(--sand-200)' }}>
                  Source: {data.dataSource} | Prices in ₹ per Quintal (100 kg)
                </div>
              </div>
            )}

            {/* Price History Chart */}
            <div className="card mb-32">
              <div className="section-header mb-24">
                <div className="section-title" style={{ fontSize: 18 }}>📈 {selectedCommodity} — Price Trend (Apr 2025 – Mar 2026)</div>
                <div className="section-sub">Estimated average price trend across markets. Use this to plan your harvest and selling timing.</div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b8279' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b8279' }} tickFormatter={v => `₹${v}`} width={70} />
                  <Tooltip formatter={(v) => [`₹${v}/Qtl`, 'Modal Price']} />
                  <Line type="monotone" dataKey="price" stroke="var(--green-500)" strokeWidth={2.5}
                    dot={{ fill: 'var(--green-500)', r: 4 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top 10 Bar Chart */}
            {data.markets.length > 1 && (
              <div className="card mb-32">
                <div className="section-header mb-24">
                  <div className="section-title" style={{ fontSize: 18 }}>🏆 Top 10 Markets by Price</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.markets.slice(0, 10).map(m => ({ name: m.market.replace(' APMC',''), price: m.modal, state: m.state }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ece3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b8279' }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b8279' }} tickFormatter={v => `₹${v}`} width={70} />
                    <Tooltip formatter={(v) => [`₹${v}/Qtl`, 'Modal Price']} />
                    <Bar dataKey="price" fill="var(--green-500)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Data Source Notice */}
            <div style={{ textAlign: 'center', padding: '16px', fontSize: 13, color: 'var(--ink-400)', borderTop: '1px solid var(--sand-200)' }}>
              📋 Data Source: <strong>{data.dataSource}</strong> | Date: {data.dataDate} | Prices in ₹ per Quintal (100 kg)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
