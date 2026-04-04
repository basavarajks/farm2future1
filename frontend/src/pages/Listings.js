import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const UNITS = ['Qtl', 'Kg', 'Ton', 'Bag'];

export default function Listings() {
  const { user } = useAuth();
  const [listings, setListings]       = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [states, setStates]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [filterCrop, setFilterCrop]   = useState('');
  const [filterState, setFilterState] = useState('');
  const [msg, setMsg]                 = useState({ text: '', type: '' });
  const [submitting, setSubmitting]   = useState(false);

  const [form, setForm] = useState({
    commodity: '', variety: '', quantity: '', unit: 'Qtl',
    askingPrice: '', shelfLifeDays: '', description: '',
  });

  // ── Load metadata + listings ────────────────────────────────────────────────
  useEffect(() => {
    api.get('/states').then(r => setStates(r.data)).catch(() => {});
    api.get('/commodities').then(r => setCommodities(r.data)).catch(() => {});
    loadListings();
  }, []);

  const loadListings = (crop = filterCrop, state = filterState) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (crop)  params.set('commodity', crop);
    if (state) params.set('state', state);    api.get(`/listings?${params}`)
      .then(r => setListings(r.data))
      .catch(() => showMsg('Could not load listings', 'error'))
      .finally(() => setLoading(false));
  };

  const handleFilter = (crop, state) => {
    setFilterCrop(crop);
    setFilterState(state);
    loadListings(crop, state);
  };

  // ── Post new listing ────────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.commodity) return showMsg('Please select a commodity', 'error');
    if (!form.quantity || isNaN(form.quantity)) return showMsg('Enter a valid quantity', 'error');
    if (!form.askingPrice || isNaN(form.askingPrice)) return showMsg('Enter a valid price', 'error');
    setSubmitting(true);
    try {
      await api.post('/listings', {
        ...form,
        quantity:     Number(form.quantity),
        askingPrice:  Number(form.askingPrice),
        shelfLifeDays: Number(form.shelfLifeDays || 0),
      });
      showMsg('✅ Listing posted! Buyers can now see your crop.', 'success');
      setShowModal(false);
      setForm({ commodity: '', variety: '', quantity: '', unit: 'Qtl', askingPrice: '', shelfLifeDays: '', description: '' });
      loadListings();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to post listing', 'error');
    } finally { setSubmitting(false); }
  };

  // ── Close a listing ─────────────────────────────────────────────────────────
  const handleClose = async id => {
    if (!window.confirm('Remove this listing? Buyers will no longer see it.')) return;
    try {
      await api.delete(`/listings/${id}`);
      showMsg('Listing removed.', 'success');
      loadListings();
    } catch { showMsg('Could not remove listing', 'error'); }
  };

  const showMsg = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const timeAgo = date => {
    const h = Math.floor((Date.now() - new Date(date)) / 3_600_000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div>
      {/* ── Hero ── */}
      <section className="page-hero">
        <div className="container">
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1>🌾 Crop Listings</h1>
              <p>Farmers posting their crops for direct sale. Contact them and buy fresh — no middlemen.</p>
            </div>
            {user?.role === 'farmer'
              ? <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>+ Post Your Crop</button>
              : !user && <a href="/register"><button className="btn btn-primary btn-lg">Register to Post</button></a>
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

        {/* ── Filters ── */}
        <div className="card mb-28">
          <div className="grid-3" style={{ gap: 16, alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">Filter by Crop</label>
              <select className="form-input" value={filterCrop}
                onChange={e => handleFilter(e.target.value, filterState)}>
                <option value="">All Crops</option>
                {commodities.slice(0, 50).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Filter by State</label>
              <select className="form-input" value={filterState}
                onChange={e => handleFilter(filterCrop, e.target.value)}>
                <option value="">All States</option>
                {states.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <button className="btn btn-outline" onClick={() => handleFilter('', '')}>
                Clear Filters
              </button>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-400)' }}>
            Showing <strong style={{ color: 'var(--ink-900)' }}>{listings.length}</strong> active listing{listings.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Perishable fast-sell banner ── */}
        {listings.some(l => l.isPerishable) && (
          <div className="perishable-banner mb-24">
            <div className="perishable-banner-icon">⚡</div>
            <div>
              <h4>Perishable Crops Available — Act Fast!</h4>
              <p>Some listings below are for crops that last only 2–3 days. Call the farmer today.</p>
            </div>
          </div>
        )}

        {loading && <div className="loader"><div className="spinner"/><span>Loading listings...</span></div>}

        {!loading && listings.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🌱</div>
            <h3>No active listings</h3>
            <p>{filterCrop || filterState ? 'Try clearing your filters.' : 'Be the first farmer to post a crop!'}</p>
            {user?.role === 'farmer' && (
              <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>
                + Post Your Crop
              </button>
            )}
          </div>
        )}

        {/* ── Listing cards ── */}
        <div className="grid-3">
          {listings.map(listing => (
            <div className="listing-card" key={listing.id} style={{ position: 'relative' }}>
              {user?.id === listing.farmerId && (
                <span className="badge badge-blue" style={{ position: 'absolute', top: 14, right: 14 }}>
                  Your Listing
                </span>
              )}

              <div className="flex items-center gap-8 mb-8">
                <div className="listing-crop">{listing.commodity}</div>
                {listing.isPerishable && <span className="badge badge-amber">⚡ Perishable</span>}
              </div>

              {listing.variety && (
                <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 4 }}>
                  Variety: {listing.variety}
                </div>
              )}

              <div className="listing-qty">
                📦 {listing.quantity} {listing.unit} available
              </div>
              <div className="listing-qty">
                📍 {listing.farmerVillage ? `${listing.farmerVillage}, ` : ''}{listing.district}, {listing.state}
              </div>

              <div className="listing-price" style={{ margin: '10px 0' }}>
                ₹{listing.askingPrice.toLocaleString()}/{listing.unit}
              </div>

              {listing.description && (
                <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 12, lineHeight: 1.6 }}>
                  {listing.description}
                </div>
              )}

              {listing.isPerishable && listing.shelfLifeDays > 0 && (
                <div style={{ fontSize: 12, background: '#fff7ed', color: '#c2410c', padding: '5px 10px',
                  borderRadius: 6, marginBottom: 10, fontWeight: 600 }}>
                  ⏰ Sell within {listing.shelfLifeDays} day{listing.shelfLifeDays > 1 ? 's' : ''}
                </div>
              )}

              <div className="listing-farmer">
                <div className="listing-farmer-avatar">{listing.farmerName[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{listing.farmerName}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{timeAgo(listing.createdAt)}</div>
                </div>
                <div className="flex gap-8">
                  <a href={`tel:${listing.farmerPhone}`}>
                    <button className="btn btn-primary btn-sm">📞 Call</button>
                  </a>
                  {listing.farmerWhatsapp && (
                    <a href={`https://wa.me/91${listing.farmerWhatsapp}?text=Hi, I saw your listing for ${listing.commodity} (${listing.quantity} ${listing.unit}) on AgriConnect. I am interested.`}
                      target="_blank" rel="noreferrer">
                      <button className="btn btn-outline btn-sm">💬 WhatsApp</button>
                    </a>
                  )}
                </div>
              </div>

              {user?.id === listing.farmerId && (
                <button className="btn btn-danger btn-sm w-full" style={{ marginTop: 12 }}
                  onClick={() => handleClose(listing.id)}>
                  Remove Listing
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Post Listing Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">📦 Post Your Crop for Sale</div>
            <div className="modal-subtitle">
              Buyers and companies across the state will see your listing instantly.
            </div>

            {msg.text && (
              <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} mb-16`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Commodity (Crop) *</label>
                <select className="form-input" value={form.commodity}
                  onChange={e => setForm({ ...form, commodity: e.target.value })} required>
                  <option value="">Select crop...</option>
                  {commodities.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Variety / Type</label>
                <input className="form-input" value={form.variety}
                  onChange={e => setForm({ ...form, variety: e.target.value })}
                  placeholder="e.g. Hybrid, Local, Red Medium..." />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input className="form-input" type="number" min="1" value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    placeholder="e.g. 50" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-input" value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Asking Price (₹ per {form.unit}) *</label>
                  <input className="form-input" type="number" min="1" value={form.askingPrice}
                    onChange={e => setForm({ ...form, askingPrice: e.target.value })}
                    placeholder="e.g. 1500" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Shelf Life (days)</label>
                  <input className="form-input" type="number" min="0" value={form.shelfLifeDays}
                    onChange={e => setForm({ ...form, shelfLifeDays: e.target.value })}
                    placeholder="e.g. 3 for tomato" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Quality details, harvest date, grade, any other info..." />
              </div>

              <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--green-700)' }}>
                📍 Your location ({user?.district}, {user?.state}) and phone number will be shown to buyers.
              </div>

              <div className="flex gap-12">
                <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Posting...' : '✅ Post Listing'}
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
