import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, []);

  const doSearch = async (q) => {
    if (!q || q.trim().length < 2) return;
    setLoading(true);
    try {
      const r = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(r.data);
      setSuggestions([]);
    } finally { setLoading(false); }
  };

  const handleInput = async (val) => {
    setQuery(val);
    if (val.length >= 2) {
      const r = await api.get(`/search?q=${encodeURIComponent(val)}`);
      setSuggestions(r.data.commodities || []);
    } else setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
    doSearch(query);
  };

  const pickSuggestion = (s) => {
    setQuery(s);
    setSuggestions([]);
    setSearchParams({ q: s });
    doSearch(s);
  };

  const totalCount = results ? (results.markets.length + results.listings.length + results.buyers.length) : 0;

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <h1>🔍 Search Crops & Markets</h1>
          <p>Search any crop to see real mandi prices from across India, active farmer listings, and interested buyers — all in one place.</p>
        </div>
      </section>

      <div className="container page" style={{ paddingTop: 0 }}>
        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mb-32" style={{ position: 'relative', maxWidth: 680 }}>
          <div className="search-bar">
            <input
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="Search crop e.g. Tomato, Onion, Chilli, Potato..."
              style={{ fontSize: 17 }}
              autoComplete="off"
            />
            <button type="submit" className="search-btn">Search →</button>
          </div>
          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'var(--white)', border: '1.5px solid var(--sand-300)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              marginTop: 4, overflow: 'hidden'
            }}>
              {suggestions.map(s => (
                <button key={s} type="button" onClick={() => pickSuggestion(s)} style={{
                  display: 'block', width: '100%', padding: '12px 18px',
                  border: 'none', background: 'none', textAlign: 'left',
                  cursor: 'pointer', fontSize: 14, color: 'var(--ink-900)',
                  borderBottom: '1px solid var(--sand-100)',
                }}
                  onMouseEnter={e => e.target.style.background = 'var(--green-50)'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                >
                  🌾 {s}
                </button>
              ))}
            </div>
          )}
        </form>

        {loading && <div className="loader"><div className="spinner"/><span>Searching real mandi data...</span></div>}

        {!loading && results && (
          <>
            <div className="mb-24" style={{ color: 'var(--ink-500)' }}>
              Found <strong style={{ color: 'var(--ink-900)' }}>{totalCount} results</strong> for "<strong>{searchParams.get('q')}</strong>"
              <button className="btn btn-outline btn-sm" style={{ marginLeft: 16 }}
                onClick={() => navigate(`/prices?commodity=${encodeURIComponent(searchParams.get('q') || '')}`)}>
                📊 View Full Price Analysis →
              </button>
            </div>

            <div className="tabs">
              {[
                { id: 'all', label: `All (${totalCount})` },
                { id: 'markets', label: `Markets (${results.markets.length})` },
                { id: 'listings', label: `Farmer Listings (${results.listings.length})` },
                { id: 'buyers', label: `Buyers/Companies (${results.buyers.length})` },
              ].map(t => (
                <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* MARKETS */}
            {(activeTab === 'all' || activeTab === 'markets') && results.markets.length > 0 && (
              <div className="mb-32">
                <div className="section-header mb-16">
                  <div className="section-title" style={{ fontSize: 18 }}>📊 Real Market Prices</div>
                  <div className="section-sub">Official mandi data — sorted by best modal price</div>
                </div>
                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: 'var(--green-900)', color: 'var(--white)' }}>
                        {['#','Market','District','State','Variety','Grade','Min ₹','Max ₹','Modal ₹'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(activeTab === 'all' ? results.markets.slice(0, 8) : results.markets).map((item, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'var(--white)' : 'var(--sand-100)', borderBottom: '1px solid var(--sand-200)' }}>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-400)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>{item.market}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-500)' }}>{item.district}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-500)' }}>{item.state}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--ink-400)', fontSize: 12 }}>{item.variety}</td>
                          <td style={{ padding: '10px 14px' }}><span className="badge badge-green" style={{ fontSize: 11 }}>{item.grade}</span></td>
                          <td style={{ padding: '10px 14px' }}>₹{item.min}</td>
                          <td style={{ padding: '10px 14px' }}>₹{item.max}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: i === 0 ? 'var(--green-600)' : 'var(--ink-900)', fontSize: 15 }}>₹{item.modal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {activeTab === 'all' && results.markets.length > 8 && (
                  <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('markets')}>
                    View All {results.markets.length} Markets →
                  </button>
                )}
              </div>
            )}

            {/* FARMER LISTINGS */}
            {(activeTab === 'all' || activeTab === 'listings') && (
              <div className="mb-32">
                <div className="section-header mb-16">
                  <div className="section-title" style={{ fontSize: 18 }}>🌾 Farmer Listings</div>
                  <div className="section-sub">Farmers currently selling this crop — contact directly</div>
                </div>
                {results.listings.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <div className="empty-state-icon">🌱</div>
                    <h3>No active listings</h3>
                    <p>No farmers have listed this crop yet.</p>
                  </div>
                ) : (
                  <div className="grid-3">
                    {results.listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
                  </div>
                )}
              </div>
            )}

            {/* BUYERS */}
            {(activeTab === 'all' || activeTab === 'buyers') && (
              <div className="mb-32">
                <div className="section-header mb-16">
                  <div className="section-title" style={{ fontSize: 18 }}>🏢 Interested Buyers & Companies</div>
                  <div className="section-sub">Companies and industries looking to buy this crop directly from farmers</div>
                </div>
                {results.buyers.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <div className="empty-state-icon">🏢</div>
                    <h3>No buyers listed for this crop</h3>
                    <p>Check the Buyers page to register as a buyer.</p>
                  </div>
                ) : (
                  <div className="grid-2">
                    {results.buyers.map(buyer => <BuyerCard key={buyer.id} buyer={buyer} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!loading && !results && (
          <div className="empty-state" style={{ padding: '80px 0' }}>
            <div className="empty-state-icon">🔍</div>
            <h3>Search for any crop</h3>
            <p>Enter a crop name above — results will show real mandi prices, farmer listings, and interested buyers.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 24 }}>
              {['Tomato','Onion','Potato','Chilli','Cabbage','Cauliflower','Wheat','Rice'].map(c => (
                <button key={c} onClick={() => pickSuggestion(c)} className="btn btn-outline btn-sm">{c}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing }) {
  const daysAgo = Math.floor((Date.now() - new Date(listing.createdAt)) / 86400000);
  return (
    <div className="listing-card">
      <div className="flex items-center gap-8 mb-8">
        <div className="listing-crop">{listing.crop}</div>
        {listing.isPerishable && <span className="badge badge-amber">⚡ Quick Sell</span>}
      </div>
      <div className="listing-qty">📦 {listing.quantity} {listing.unit} • 📍 {listing.district}, {listing.state}</div>
      <div className="listing-price" style={{ margin: '8px 0' }}>₹{listing.askingPrice}/Qtl</div>
      {listing.description && <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 8 }}>{listing.description}</div>}
      <div className="listing-farmer">
        <div className="listing-farmer-avatar">{listing.farmerName[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{listing.farmerName}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</div>
        </div>
        <a href={`tel:${listing.farmerPhone}`}><button className="btn btn-outline btn-sm">📞 Call</button></a>
      </div>
    </div>
  );
}

function BuyerCard({ buyer }) {
  return (
    <div className="buyer-card">
      <div className="flex items-center gap-12 mb-12">
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏢</div>
        <div>
          <div className="buyer-name">{buyer.buyerName}{buyer.verified && <span className="badge badge-green" style={{ marginLeft: 8 }}>✓ Verified</span>}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', textTransform: 'capitalize' }}>{buyer.buyerType}</div>
        </div>
      </div>
      <div className="buyer-crops">{buyer.commoditiesNeeded?.map(c => <span key={c} className="crop-tag">{c}</span>)}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', margin: '10px 0' }}>{buyer.description}</div>
      <div className="flex gap-8">
        <a href={`tel:${buyer.phone}`} style={{ flex: 1 }}><button className="btn btn-primary btn-sm w-full">📞 Call</button></a>
      </div>
    </div>
  );
}
