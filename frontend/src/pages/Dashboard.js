import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]       = useState(null);
  const [myItems, setMyItems]   = useState([]);
  const [dataStatus, setDataStatus] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get('/dashboard'),
      api.get('/data-status'),
      user.role === 'farmer'
        ? api.get('/listings')
        : api.get('/buyer-posts/my'),
    ])
      .then(([statsRes, dsRes, itemsRes]) => {
        setStats(statsRes.data);
        setDataStatus(dsRes.data);
        setMyItems(itemsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => { logout(); navigate('/'); };

  if (!user) return null;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="page-hero">
        <div className="container">
          <div className="flex items-center gap-16" style={{ flexWrap: 'wrap' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: user.role === 'farmer' ? 'var(--green-500)' : 'var(--blue-500)',
              color: 'var(--white)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 26, fontWeight: 800,
              flexShrink: 0,
            }}>
              {user.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ marginBottom: 4 }}>
                {user.role === 'farmer' ? '🌾' : '🏢'} Welcome, {user.name.split(' ')[0]}!
              </h1>
              <p style={{ color: 'var(--ink-200)' }}>
                {user.role === 'farmer'
                  ? `📍 ${user.village ? user.village + ', ' : ''}${user.district}, ${user.state}  •  Farmer Account`
                  : `🏭 ${user.companyName || user.name}  •  ${user.companyType || 'Buyer'}`
                }
              </p>
            </div>
            <button className="btn btn-outline" style={{ color: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </section>

      <div className="container page" style={{ paddingTop: 0 }}>
        {loading && <div className="loader"><div className="spinner"/></div>}

        {!loading && stats && (
          <>
            {/* ── Stats ── */}
            {user.role === 'farmer'
              ? <FarmerStats stats={stats} dataStatus={dataStatus} />
              : <BuyerStats stats={stats} />
            }

            {/* ── Data Status Card (shown to farmers) ── */}
            {user.role === 'farmer' && dataStatus && (
              <div className="card mb-28" style={{ background: 'var(--green-900)', border: 'none' }}>
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ color: 'var(--green-300)', fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 6 }}>
                      📊 Market Data Status
                    </h3>
                    <p style={{ color: 'var(--ink-200)', fontSize: 13 }}>
                      {dataStatus.liveAPIEnabled
                        ? '🟢 Live API active — prices update every 6 hours from data.gov.in'
                        : '📁 Using CSV data — add API key in .env for live prices'}
                    </p>
                  </div>
                  <div className="flex gap-24">
                    {[
                      [dataStatus.totalRecords?.toLocaleString(), 'Price Records'],
                      [dataStatus.totalStates, 'States'],
                      [dataStatus.totalCommodities, 'Commodities'],
                    ].map(([v, l]) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--green-400)' }}>{v}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-200)' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Quick Actions ── */}
            <div className="card mb-28">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 16 }}>
                ⚡ Quick Actions
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {user.role === 'farmer' ? (
                  <>
                    <Link to="/prices"><button className="btn btn-primary">📊 Check Market Prices</button></Link>
                    <Link to="/listings"><button className="btn btn-outline">+ Post Crop for Sale</button></Link>
                    <Link to="/buyers"><button className="btn btn-outline">🏢 Browse Buyers</button></Link>
                    <Link to="/search"><button className="btn btn-outline">🔍 Search Crops</button></Link>
                  </>
                ) : (
                  <>
                    <Link to="/listings"><button className="btn btn-primary">🌾 Browse Farmer Listings</button></Link>
                    <Link to="/buyers"><button className="btn btn-outline">+ Post Requirement</button></Link>
                    <Link to="/search"><button className="btn btn-outline">🔍 Search Farmers</button></Link>
                    <Link to="/prices"><button className="btn btn-outline">📊 Market Prices</button></Link>
                  </>
                )}
              </div>
            </div>

            {/* ── My Listings / My Posts ── */}
            {user.role === 'farmer'
              ? <MyListings items={myItems} />
              : <MyBuyerPosts items={myItems} />
            }
          </>
        )}
      </div>
    </div>
  );
}

// ── Farmer stats row ──────────────────────────────────────────────────────────
function FarmerStats({ stats }) {
  const cards = [
    { icon: '📋', label: 'My Active Listings', value: stats.myActiveListings, color: 'var(--green-50)',  accent: 'var(--green-600)' },
    { icon: '🏢', label: 'Active Buyers',       value: stats.totalBuyerPosts,  color: 'var(--blue-100)', accent: '#1d4ed8' },
    { icon: '🏪', label: 'APMC Markets',         value: `${stats.totalMarkets}+`, color: 'var(--amber-100)', accent: '#92400e' },
    { icon: '🌾', label: 'Commodities Tracked',  value: stats.totalCommodities, color: '#f3e8ff', accent: '#6d28d9' },
  ];
  return (
    <div className="grid-4 mb-28">
      {cards.map(c => (
        <div key={c.label} className="card" style={{ background: c.color, border: 'none', padding: '20px 22px' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-display)', color: c.accent }}>{c.value}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Buyer stats row ───────────────────────────────────────────────────────────
function BuyerStats({ stats }) {
  const cards = [
    { icon: '📋', label: 'My Active Posts',   value: stats.myActivePosts,  color: 'var(--blue-100)', accent: '#1d4ed8' },
    { icon: '🌾', label: 'Active Farmer Listings', value: stats.totalListings,  color: 'var(--green-50)',  accent: 'var(--green-600)' },
    { icon: '👨‍🌾', label: 'Registered Farmers', value: stats.totalFarmers,   color: 'var(--amber-100)', accent: '#92400e' },
    { icon: '📊', label: 'Price Records',      value: `${(stats.totalRecords / 1000).toFixed(0)}K+`, color: '#f3e8ff', accent: '#6d28d9' },
  ];
  return (
    <div className="grid-4 mb-28">
      {cards.map(c => (
        <div key={c.label} className="card" style={{ background: c.color, border: 'none', padding: '20px 22px' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-display)', color: c.accent }}>{c.value}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Farmer's own listings ─────────────────────────────────────────────────────
function MyListings({ items }) {
  const myActive = items.filter(l => l.status === 'active');
  return (
    <div>
      <div className="section-header mb-20">
        <div className="section-title">My Crop Listings</div>
        <div className="section-sub">{myActive.length} active · {items.length} total</div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌱</div>
          <h3>No listings yet</h3>
          <p>Post your first crop to connect with buyers!</p>
          <Link to="/listings" style={{ marginTop: 20, display: 'inline-block' }}>
            <button className="btn btn-primary">Post a Crop →</button>
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {items.map(listing => (
            <div className="listing-card" key={listing.id}>
              <div className="flex items-center justify-between mb-8">
                <div className="listing-crop">{listing.commodity}</div>
                <span className={`badge ${listing.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                  {listing.status}
                </span>
              </div>
              {listing.variety && (
                <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 4 }}>Variety: {listing.variety}</div>
              )}
              <div className="listing-qty">📦 {listing.quantity} {listing.unit}</div>
              <div className="listing-price" style={{ margin: '8px 0' }}>
                ₹{listing.askingPrice?.toLocaleString()}/{listing.unit}
              </div>
              {listing.description && (
                <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{listing.description}</div>
              )}
              <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 8 }}>
                📅 {new Date(listing.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Buyer's own posts ─────────────────────────────────────────────────────────
function MyBuyerPosts({ items }) {
  return (
    <div>
      <div className="section-header mb-20">
        <div className="section-title">My Requirement Posts</div>
        <div className="section-sub">{items.filter(p => p.status === 'active').length} active</div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No posts yet</h3>
          <p>Post what crops you need and farmers will contact you.</p>
          <Link to="/buyers" style={{ marginTop: 20, display: 'inline-block' }}>
            <button className="btn btn-primary">Post a Requirement →</button>
          </Link>
        </div>
      ) : (
        <div className="grid-2">
          {items.map(post => (
            <div className="buyer-card" key={post.id}>
              <div className="flex items-center justify-between mb-12">
                <div className="buyer-name">{post.buyerName}</div>
                <span className={`badge ${post.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                  {post.status}
                </span>
              </div>
              <div className="buyer-crops mb-12">
                {post.commoditiesNeeded?.map(c => <span key={c} className="crop-tag">{c}</span>)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-700)', marginBottom: 6 }}>
                📦 {post.quantityNeeded}
              </div>
              {post.priceOffered && (
                <div style={{ fontSize: 13, color: 'var(--green-600)', fontWeight: 600, marginBottom: 6 }}>
                  💰 {post.priceOffered}
                </div>
              )}
              <div style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.6 }}>{post.description}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 8 }}>
                📅 {new Date(post.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
