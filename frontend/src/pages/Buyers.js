import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const TYPE_ICONS   = { 'Food Processing Company': '🏭', 'Spice Industry': '🌶️', 'Processing Industry': '🏗️', 'Retail Chain': '🛒', 'Export Company': '✈️', 'Individual Buyer': '👤', default: '🏢' };
const TYPE_COLORS  = { 'Food Processing Company': 'var(--blue-100)', 'Spice Industry': '#fff7ed', 'Retail Chain': '#f3e8ff', 'Individual Buyer': 'var(--green-100)', default: '#f1f5f9' };

export default function Buyers() {
  const { user } = useAuth();
  const [buyers, setBuyers]           = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [filterCrop, setFilterCrop]   = useState('');
  const [msg, setMsg]                 = useState({ text: '', type: '' });
  const [submitting, setSubmitting]   = useState(false);

  const [form, setForm] = useState({
    commoditiesNeeded: [], quantityNeeded: '', priceOffered: '', description: '', state: '',
  });

  useEffect(() => {
    api.get('/commodities').then(r => setCommodities(r.data)).catch(() => {});
    loadBuyers();
  }, []);

  const loadBuyers = (crop = filterCrop) => {
    setLoading(true);
    const params = crop ? `?commodity=${encodeURIComponent(crop)}` : '';
    api.get(`/buyer-posts${params}`)
      .then(r => setBuyers(r.data))
      .catch(() => showMsg('Could not load buyers', 'error'))
      .finally(() => setLoading(false));
  };

  const handleFilter = crop => {
    setFilterCrop(crop);
    loadBuyers(crop);
  };

  const toggleCrop = crop => {
    setForm(f => ({
      ...f,
      commoditiesNeeded: f.commoditiesNeeded.includes(crop)
        ? f.commoditiesNeeded.filter(c => c !== crop)
        : [...f.commoditiesNeeded, crop],
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.commoditiesNeeded.length === 0) return showMsg('Select at least one crop you need', 'error');
    if (!form.quantityNeeded.trim())         return showMsg('Quantity needed is required', 'error');
    if (!form.description.trim())            return showMsg('Please describe your requirements', 'error');
    setSubmitting(true);
    try {
      await api.post('/buyer-posts', form);
      showMsg('✅ Requirement posted! Farmers will contact you.', 'success');
      setShowModal(false);
      setForm({ commoditiesNeeded: [], quantityNeeded: '', priceOffered: '', description: '', state: '' });
      loadBuyers();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to post requirement', 'error');
    } finally { setSubmitting(false); }
  };

  const handleRemove = async id => {
    if (!window.confirm('Remove this requirement post?')) return;
    try {
      await api.delete(`/buyer-posts/${id}`);
      showMsg('Post removed.', 'success');
      loadBuyers();
    } catch { showMsg('Could not remove post', 'error'); }
  };

  const showMsg = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const getTypeIcon  = t => TYPE_ICONS[t]  || TYPE_ICONS.default;
  const getTypeColor = t => TYPE_COLORS[t] || TYPE_COLORS.default;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="page-hero">
        <div className="container">
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1>🏢 Buyers & Companies</h1>
              <p>Companies, industries, and bulk buyers looking to purchase crops directly from farmers. No middlemen.</p>
            </div>
            {user?.role === 'buyer'
              ? <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>+ Post Requirement</button>
              : !user && <a href="/register?type=buyer"><button className="btn btn-primary btn-lg">Register as Buyer</button></a>
            }
          </div>
        </div>
      </section>

      <div className="container page" style={{ paddingTop: 0 }}>
        {msg.text && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} mb-24`}>
            {msg.text}
          </div>
        )}

        {/* ── Info banner ── */}
        <div className="card mb-28" style={{ background: 'linear-gradient(135deg, var(--green-900), #0a2218)', border: 'none' }}>
          <div className="flex items-center gap-20" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--green-300)', fontFamily: 'var(--font-display)', fontSize: 17, marginBottom: 8 }}>
                🤝 Sell Directly — Zero Commission
              </h3>
              <p style={{ color: 'var(--ink-200)', fontSize: 14, lineHeight: 1.7 }}>
                These buyers purchase crops directly from farmers — no middlemen, no commission. 
                Call them, agree on price, and sell. Simple.
              </p>
            </div>
            <div className="flex gap-28">
              {[
                [buyers.filter(b => b.verified).length, 'Verified Buyers'],
                [buyers.length, 'Active Posts'],
              ].map(([v, l]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--green-400)' }}>{v}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-200)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Filter ── */}
        <div className="flex items-center gap-12 mb-24" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-500)' }}>Filter by crop:</span>
          <select className="form-input" style={{ width: 'auto' }} value={filterCrop}
            onChange={e => handleFilter(e.target.value)}>
            <option value="">All Crops</option>
            {commodities.slice(0, 50).map(c => <option key={c}>{c}</option>)}
          </select>
          {filterCrop && (
            <button className="btn btn-outline btn-sm" onClick={() => handleFilter('')}>✕ Clear</button>
          )}
        </div>

        {loading && <div className="loader"><div className="spinner"/></div>}

        {!loading && buyers.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <h3>No buyers found</h3>
            <p>{filterCrop ? `No buyers need "${filterCrop}" right now.` : 'No active buyer requirements posted yet.'}</p>
          </div>
        )}

        {/* ── Buyer cards ── */}
        <div className="grid-2">
          {buyers.map(buyer => (
            <div className="buyer-card" key={buyer.id} style={{ position: 'relative' }}>
              {user?.id === buyer.buyerId && (
                <span className="badge badge-blue" style={{ position: 'absolute', top: 14, right: 14 }}>
                  Your Post
                </span>
              )}

              {/* Header */}
              <div className="flex items-center gap-12 mb-14">
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: getTypeColor(buyer.buyerType),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                  flexShrink: 0,
                }}>
                  {getTypeIcon(buyer.buyerType)}
                </div>
                <div>
                  <div className="buyer-name" style={{ fontSize: 16 }}>
                    {buyer.buyerName}
                    {buyer.verified && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, background: 'var(--green-100)',
                        color: 'var(--green-700)', padding: '2px 8px', borderRadius: 100, fontWeight: 700,
                      }}>✓ Verified</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 2 }}>
                    {buyer.buyerType}
                    {buyer.state && buyer.state !== 'All India' && ` • ${buyer.state}`}
                    {buyer.state === 'All India' && <span style={{ color: 'var(--green-600)', fontWeight: 600 }}> • All India</span>}
                  </div>
                </div>
              </div>

              {/* Crops needed */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Crops Needed
                </div>
                <div className="buyer-crops">
                  {buyer.commoditiesNeeded.map(c => (
                    <span key={c} className="crop-tag">{c}</span>
                  ))}
                </div>
              </div>

              {/* Details */}
              {buyer.description && (
                <p style={{ fontSize: 14, color: 'var(--ink-500)', marginBottom: 12, lineHeight: 1.6 }}>
                  {buyer.description}
                </p>
              )}

              <div className="flex gap-16 mb-14" style={{ fontSize: 13, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--ink-400)', fontSize: 11, display: 'block', marginBottom: 2 }}>QUANTITY NEEDED</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>📦 {buyer.quantityNeeded}</span>
                </div>
                {buyer.priceOffered && (
                  <div>
                    <span style={{ color: 'var(--ink-400)', fontSize: 11, display: 'block', marginBottom: 2 }}>PRICE OFFERED</span>
                    <span style={{ fontWeight: 600, color: 'var(--green-600)' }}>💰 {buyer.priceOffered}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-8">
                <a href={`tel:${buyer.buyerPhone}`} style={{ flex: 1 }}>
                  <button className="btn btn-primary btn-sm w-full">📞 Call Now</button>
                </a>
                {buyer.buyerWhatsapp && (
                  <a href={`https://wa.me/91${buyer.buyerWhatsapp}?text=Hello, I am a farmer and I saw your requirement for ${buyer.commoditiesNeeded.join(', ')} on AgriConnect. I am interested to sell.`}
                    target="_blank" rel="noreferrer">
                    <button className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>
                      💬 WhatsApp
                    </button>
                  </a>
                )}
              </div>

              {user?.id === buyer.buyerId && (
                <button className="btn btn-danger btn-sm w-full" style={{ marginTop: 10 }}
                  onClick={() => handleRemove(buyer.id)}>
                  Remove Post
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Post Requirement Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-title">📋 Post Buying Requirement</div>
            <div className="modal-subtitle">
              Farmers across the state will see your requirement and contact you directly.
            </div>

            {msg.text && (
              <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} mb-16`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">
                  Select Crops You Need *
                  {form.commoditiesNeeded.length > 0 && (
                    <span style={{ color: 'var(--green-600)', fontWeight: 700, marginLeft: 8 }}>
                      ({form.commoditiesNeeded.length} selected)
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto', padding: '4px 0' }}>
                  {commodities.slice(0, 60).map(crop => (
                    <button type="button" key={crop} onClick={() => toggleCrop(crop)} style={{
                      padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', transition: '0.12s',
                      border: form.commoditiesNeeded.includes(crop) ? '2px solid var(--green-500)' : '1.5px solid var(--sand-300)',
                      background: form.commoditiesNeeded.includes(crop) ? 'var(--green-50)' : 'var(--white)',
                      color: form.commoditiesNeeded.includes(crop) ? 'var(--green-700)' : 'var(--ink-600)',
                    }}>
                      {crop}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Quantity Needed *</label>
                  <input className="form-input" value={form.quantityNeeded}
                    onChange={e => setForm({ ...form, quantityNeeded: e.target.value })}
                    placeholder="e.g. 500 Qtl/month" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Price You Offer</label>
                  <input className="form-input" value={form.priceOffered}
                    onChange={e => setForm({ ...form, priceOffered: e.target.value })}
                    placeholder="e.g. Market rate + 5%" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">State / Coverage Area</label>
                <input className="form-input" value={form.state}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                  placeholder="e.g. Karnataka or All India" />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-input" rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your requirements — payment terms, pickup, quality needed, contract availability..."
                  required />
              </div>

              <div style={{ background: 'var(--blue-100)', borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#1e40af' }}>
                📞 Your registered phone number will be shown to farmers so they can call you.
              </div>

              <div className="flex gap-12">
                <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Posting...' : '✅ Post Requirement'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
