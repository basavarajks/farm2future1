import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const features = [
  { icon: '📊', color: '#d4f5e4', title: 'Real Official Market Prices', desc: '8,000+ records from 900+ APMC markets across 24 states — sourced directly from Agmarknet. Updated daily.' },
  { icon: '🤖', color: '#dbeafe', title: 'Smart Sell Recommendation', desc: 'AI-powered advice: sell now, hold, or urgently sell based on live prices, best market, and seasonal trends.' },
  { icon: '⚡', color: '#fff7ed', title: 'Perishable Crop Fast Lane', desc: 'Tomato, brinjal, green chilli lasting only 2-3 days? Get instant buyer contacts and nearest market prices.' },
  { icon: '🏢', color: '#f3e8ff', title: 'Direct Company Buying', desc: 'Skip middlemen. Sell directly to food companies, spice industries, and bulk buyers at better prices.' },
  { icon: '🌏', color: '#fef3c7', title: 'National Price Comparison', desc: 'See what the same crop fetches in other states. Know if your state is paying fair market price.' },
  { icon: '💰', color: '#ffe4e6', title: 'Price Opportunity Finder', desc: 'Instantly see which crops have the biggest price gap between markets — find where you lose money and where to gain.' },
];

const quickCrops = ['Tomato','Onion','Potato','Green Chilli','Garlic','Turmeric','Ragi(Finger Millet)','Groundnut','Coconut','Cotton'];

export default function Home() {
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalRecords: '8,000+', totalStates: '24', totalCommodities: '217', latestDate: '25 March 2026', liveAPIEnabled: false });
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/data-status').then(r => {
      setStats({
        totalRecords: r.data.totalRecords.toLocaleString(),
        totalStates: r.data.totalStates,
        totalCommodities: r.data.totalCommodities,
        latestDate: r.data.latestDate,
        liveAPIEnabled: r.data.liveAPIEnabled
      });
    }).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="home-hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-eyebrow">📡 Real Agmarknet Data • 24 States • 900+ Markets</div>
            <h1 className="hero-title">
              Know Every Market.<br/>
              <em>Sell at the Best Price.</em>
            </h1>
            <p className="hero-desc">
              Stop losing money to local market prices. Compare real official prices from every APMC market in your state — before you travel.
            </p>

            <form onSubmit={handleSearch}>
              <div className="search-bar" style={{ maxWidth: 580 }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search crop e.g. Tomato, Onion, Ragi, Cotton..."
                  style={{ fontSize: 16 }}
                />
                <button type="submit" className="search-btn">Search Markets →</button>
              </div>
            </form>

            {/* Quick crop buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
              {quickCrops.map(crop => (
                <button key={crop} onClick={() => navigate(`/prices?crop=${crop}`)} style={{
                  background: 'rgba(255,255,255,0.1)', color: 'var(--ink-200)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 100,
                  padding: '5px 14px', fontSize: 13, cursor: 'pointer', transition: '0.15s'
                }}
                onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.2)'; e.target.style.color = 'white'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = 'var(--ink-200)'; }}
                >{crop}</button>
              ))}
            </div>

            <div className="hero-stat-row">
              {[[stats.totalRecords, 'Real Price Records'], [stats.totalStates, 'States Covered'], [stats.totalCommodities, 'Crops & Commodities']].map(([n, l]) => (
                <div key={l}>
                  <div className="hero-stat-num">{n}</div>
                  <div className="hero-stat-label">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── DATA SOURCE BADGE ─── */}
      <div style={{ background: 'var(--green-800)', padding: '14px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', color: 'var(--ink-200)', fontSize: 14 }}>
            <span>{stats.liveAPIEnabled ? '📡 ' : '📄 '}<strong style={{ color: 'var(--green-300)' }}>{stats.liveAPIEnabled ? 'Live APIs + Archive DB:' : 'Official Data Source:'}</strong> {stats.liveAPIEnabled ? 'Agmarknet API Real-time Data' : 'Agmarknet — Ministry of Agriculture'}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>📅 Last Updated & Live Data: <strong style={{ color: 'var(--white)' }}>{stats.latestDate}</strong></span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>{stats.liveAPIEnabled ? '🟢' : '✅'} <strong style={{ color: 'var(--green-300)' }}>{stats.liveAPIEnabled ? 'Live Syncing properly' : 'Free to use for all farmers'}</strong></span>
          </div>
        </div>
      </div>

      {/* ─── FEATURES ─── */}
      <section style={{ padding: '80px 0', background: 'var(--sand-100)' }}>
        <div className="container">
          <div className="section-header text-center" style={{ marginBottom: 48 }}>
            <h2 className="section-title" style={{ fontSize: 34 }}>Everything a Farmer Needs</h2>
            <p className="section-sub" style={{ fontSize: 16, maxWidth: 520, margin: '10px auto 0' }}>
              Real data, smart tools, and direct buyer connections — all in one free platform.
            </p>
          </div>
          <div className="grid-3">
            {features.map(f => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding: '80px 0', background: 'var(--white)' }}>
        <div className="container">
          <div className="text-center mb-32">
            <h2 className="section-title" style={{ fontSize: 34 }}>How It Works</h2>
          </div>
          <div className="grid-3" style={{ textAlign: 'center' }}>
            {[
              { icon: '🌾', title: 'Select your crop', desc: 'Choose your state and type in the crop you want to sell.' },
              { icon: '📊', title: 'Compare all APMC markets', desc: 'See real prices from every government market — sorted best to worst instantly.' },
              { icon: '✅', title: 'Sell smarter', desc: 'Go to the best market, contact a direct buyer, or hold based on our recommendation.' },
            ].map(item => (
              <div key={item.title} style={{ padding: '20px 16px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--green-900)', color: 'var(--green-300)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, margin: '0 auto 20px',
                }}>{item.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
                <div style={{ color: 'var(--ink-500)', fontSize: 14 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CREATOR ─── */}
      <section style={{ padding: '80px 0', background: 'var(--sand-50)' }}>
        <div className="container text-center">
          <h2 className="section-title" style={{ fontSize: 30, marginBottom: 40 }}>Meet the Creator</h2>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            maxWidth: 500, margin: '0 auto', padding: '32px',
            background: 'var(--white)', borderRadius: '24px',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)'
          }}>
            <img src="/creator.jpg" alt="Basavaraj" style={{
              width: 120, height: 120, borderRadius: '50%', objectFit: 'cover',
              border: '4px solid var(--white)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
              marginBottom: 16
            }} />
            <h3 style={{ fontSize: 22, fontFamily: 'var(--font-display)', marginBottom: 6, color: 'var(--ink-900)' }}>Basavaraj</h3>
            <p style={{ color: 'var(--ink-500)', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
              The creator of Farm2Future. Built with the vision to empower farmers with real-time market data across India and to facilitate direct, transparent trades between farms and businesses without middlemen.
            </p>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <a href="https://www.linkedin.com/in/basavarajkb06?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px', transition: '0.2s', padding: '6px 12px', background: 'rgba(0,119,181,0.1)', borderRadius: '8px' }}>
                 LinkedIn
              </a>
              <a href="https://github.com/basavarajks" target="_blank" rel="noreferrer" style={{ color: '#333333', textDecoration: 'none', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px', transition: '0.2s', padding: '6px 12px', background: 'rgba(51,51,51,0.1)', borderRadius: '8px' }}>
                 GitHub
              </a>
              <a href="https://www.instagram.com/basavaraj_kb_06?igsh=dm11ajRsdGkxeGt2" target="_blank" rel="noreferrer" style={{ color: '#E1306C', textDecoration: 'none', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px', transition: '0.2s', padding: '6px 12px', background: 'rgba(225,48,108,0.1)', borderRadius: '8px' }}>
                 Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ background: 'var(--green-900)', padding: '80px 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--white)', marginBottom: 16 }}>
            Are You a Company or Buyer?
          </h2>
          <p style={{ color: 'var(--ink-200)', fontSize: 17, maxWidth: 480, margin: '0 auto 32px' }}>
            Register as a buyer to post your requirements. Farmers across India will contact you directly with fresh produce.
          </p>
          <a href="/register">
            <button className="btn btn-primary btn-lg">Register as Buyer / Company →</button>
          </a>
        </div>
      </section>
    </div>
  );
}
