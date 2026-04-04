import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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
              {[['8,000+', 'Real Price Records'], ['24', 'States Covered'], ['217', 'Crops & Commodities']].map(([n, l]) => (
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
            <span>📡 <strong style={{ color: 'var(--green-300)' }}>Official Data Source:</strong> Agmarknet — Ministry of Agriculture & Farmers Welfare, Government of India</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>📅 Last Updated: <strong style={{ color: 'var(--white)' }}>25 March 2026</strong></span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>✅ <strong style={{ color: 'var(--green-300)' }}>Free to use for all farmers</strong></span>
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
