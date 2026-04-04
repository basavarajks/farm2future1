import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STATES = ['Andaman and Nicobar','Andhra Pradesh','Assam','Bihar','Chattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Pondicherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
const COMPANY_TYPES = ['Food Processing','Export Company','Retail Chain','Supermarket','Spice Industry','Starch & Chemical Industry','Animal Feed Industry','Cold Storage & Logistics','Wholesale Trader','Individual Buyer','Other'];
const TOP_CROPS = ['Tomato','Onion','Potato','Brinjal','Cabbage','Cauliflower','Carrot','Beans','Peas','Spinach','Coriander','Chilli','Garlic','Ginger','Rice','Wheat','Maize','Sorghum','Groundnut','Sunflower','Cotton','Turmeric','Mango','Banana','Papaya','Grapes'];

function Field({ label, required, error, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label} {required && <span style={{ color: 'var(--red-500)' }}>*</span>}</label>
      {children}
      {error && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 3 }}>⚠ {error}</div>}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'farmer' ? '/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your email and password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🌾 AgriConnect</div>
        <div className="auth-subtitle">Sign in to your account</div>

        <div className="alert alert-warning mb-24" style={{ fontSize: 13 }}>
          <strong>Demo:</strong> farmer@demo.com / demo123 &nbsp;|&nbsp; company@demo.com / demo123
        </div>

        {error && <div className="alert alert-error mb-16">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <Field label="Email Address" required>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" required />
          </Field>
          <Field label="Password" required>
            <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
          </Field>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
        <div className="auth-toggle">
          No account? <a onClick={() => navigate('/register')} style={{ cursor: 'pointer' }}>Register Free</a>
        </div>
      </div>
    </div>
  );
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const [role, setRole]       = useState('farmer');
  const [errors, setErrors]   = useState({});
  const [apiError, setApiErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [crops, setCrops]     = useState([]);

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', whatsapp: '',
    district: '', state: 'Karnataka', village: '',
    companyName: '', companyType: 'Food Processing', gstNumber: '', address: '', description: '',
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const set = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => ({ ...er, [k]: '' }));
  };

  const toggleCrop = c => setCrops(prev =>
    prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
  );

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = 'Full name is required';
    if (!form.email.trim())    e.email    = 'Email is required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.phone.trim())    e.phone    = 'Phone number is required';
    if (!form.district.trim()) e.district = 'District is required';
    if (!form.state)           e.state    = 'State is required';
    if (role === 'farmer' && !form.village.trim()) e.village = 'Village/Town is required';
    if (role === 'buyer') {
      if (!form.companyName.trim()) e.companyName = 'Company name is required';
      if (!form.companyType)        e.companyType = 'Company type is required';
    }
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiErr('');
    try {
      const payload = {
        ...form,
        role,
        whatsapp: form.whatsapp || form.phone,
        ...(role === 'farmer' ? { cropsGrown: crops } : { cropsNeeded: crops }),
      };
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      setApiErr(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40 }}>
      <div className="auth-card" style={{ maxWidth: 580 }}>
        <div className="auth-logo">🌾 AgriConnect</div>
        <div className="auth-subtitle">Create your free account</div>

        {/* Role toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, background: 'var(--sand-100)', padding: 6, borderRadius: 'var(--radius-md)' }}>
          {[['farmer','🌾 I am a Farmer'], ['buyer','🏢 I am a Buyer / Company']].map(([r, l]) => (
            <button key={r} type="button" onClick={() => { setRole(r); setCrops([]); }} style={{
              flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              background: role === r ? 'var(--white)' : 'transparent',
              color: role === r ? 'var(--green-600)' : 'var(--ink-400)',
              boxShadow: role === r ? 'var(--shadow-sm)' : 'none', transition: '0.15s',
            }}>{l}</button>
          ))}
        </div>

        {apiError && <div className="alert alert-error mb-16">{apiError}</div>}

        <form onSubmit={submit} className="auth-form">

          {/* ─── COMMON FIELDS ─── */}
          <Field label="Full Name" required error={errors.name}>
            <input className="form-input" value={form.name} onChange={set('name')}
              placeholder={role === 'buyer' ? 'Contact Person Name' : 'Ramesh Kumar'} />
          </Field>

          <div className="grid-2">
            <Field label="Email" required error={errors.email}>
              <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" />
            </Field>
            <Field label="Password (min 6 chars)" required error={errors.password}>
              <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
            </Field>
          </div>

          <div className="grid-2">
            <Field label="Mobile Number" required error={errors.phone}>
              <input className="form-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="9876543210" maxLength={10} />
            </Field>
            <Field label="WhatsApp Number">
              <input className="form-input" type="tel" value={form.whatsapp} onChange={set('whatsapp')} placeholder="Same as mobile if same" maxLength={10} />
            </Field>
          </div>

          <div className="grid-2">
            <Field label="State" required error={errors.state}>
              <select className="form-input" value={form.state} onChange={set('state')}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="District" required error={errors.district}>
              <input className="form-input" value={form.district} onChange={set('district')} placeholder="Your district" />
            </Field>
          </div>

          {/* ─── FARMER ONLY ─── */}
          {role === 'farmer' && (
            <>
              <Field label="Village / Town" required error={errors.village}>
                <input className="form-input" value={form.village} onChange={set('village')} placeholder="Shiraguppi" />
              </Field>
              <div className="form-group">
                <label className="form-label">Crops You Grow <span style={{ fontWeight: 400, color: 'var(--ink-400)' }}>(select all)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
                  {TOP_CROPS.map(c => (
                    <button key={c} type="button" onClick={() => toggleCrop(c)} style={{
                      padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: crops.includes(c) ? '2px solid var(--green-500)' : '1.5px solid var(--sand-300)',
                      background: crops.includes(c) ? 'var(--green-50)' : 'var(--white)',
                      color: crops.includes(c) ? 'var(--green-700)' : 'var(--ink-700)', transition: '0.12s',
                    }}>{c}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── BUYER ONLY ─── */}
          {role === 'buyer' && (
            <>
              <Field label="Company / Business Name" required error={errors.companyName}>
                <input className="form-input" value={form.companyName} onChange={set('companyName')} placeholder="FreshMart Foods Pvt Ltd" />
              </Field>
              <div className="grid-2">
                <Field label="Type of Business" required error={errors.companyType}>
                  <select className="form-input" value={form.companyType} onChange={set('companyType')}>
                    {COMPANY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="GST Number">
                  <input className="form-input" value={form.gstNumber} onChange={set('gstNumber')} placeholder="29AABCF1234D1Z5" />
                </Field>
              </div>
              <Field label="Business Address">
                <input className="form-input" value={form.address} onChange={set('address')} placeholder="Full address" />
              </Field>
              <div className="form-group">
                <label className="form-label">Crops / Commodities You Buy <span style={{ fontWeight: 400, color: 'var(--ink-400)' }}>(select all)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
                  {TOP_CROPS.map(c => (
                    <button key={c} type="button" onClick={() => toggleCrop(c)} style={{
                      padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: crops.includes(c) ? '2px solid var(--green-500)' : '1.5px solid var(--sand-300)',
                      background: crops.includes(c) ? 'var(--green-50)' : 'var(--white)',
                      color: crops.includes(c) ? 'var(--green-700)' : 'var(--ink-700)', transition: '0.12s',
                    }}>{c}</button>
                  ))}
                </div>
              </div>
              <Field label="About Your Business">
                <textarea className="form-input" rows={3} value={form.description} onChange={set('description')}
                  placeholder="What you buy, quantities, payment terms, any special requirements..." />
              </Field>
            </>
          )}

          <button type="submit" className="btn btn-primary w-full btn-lg" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating Account...' : `Create ${role === 'farmer' ? 'Farmer' : 'Buyer'} Account →`}
          </button>
        </form>

        <div className="auth-toggle">
          Already have an account? <a onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>Sign In</a>
        </div>
      </div>
    </div>
  );
}
