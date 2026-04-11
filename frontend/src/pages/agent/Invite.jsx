import { useState } from 'react';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const AgentInvite = () => {
  const [formData, setFormData] = useState({ email: '', password: '', phone: '', store_name: '' });
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post('/agent/create-agent', formData);
      const storeLink = r.data.user?.store_slug
        ? `${window.location.origin}/store/${r.data.user.store_slug}`
        : null;
      setResult({ success: true, message: r.data.message, storeLink, email: r.data.user?.email });
      setFormData({ email: '', password: '', phone: '', store_name: '' });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Failed to create agent' });
    } finally { setLoading(false); }
  };

  const copy = (text, label = 'Copied!') => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label}`);
  };

  // Shared input style
  const inp = {
    width: '100%', padding: '0.875rem 1rem',
    border: '1px solid var(--border-color)', borderRadius: '0.625rem',
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s',
  };

  const lbl = (text, req) => (
    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
      {text} {req && <span style={{ color: 'var(--danger)' }}>*</span>}
    </label>
  );

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/agent/invite" />

      <main className="main-content" style={{ paddingTop: '1rem', maxWidth: '520px' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', color: 'white' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>📨</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.2rem' }}>Invite New Agent</h2>
          <p style={{ opacity: 0.88, fontSize: '0.85rem' }}>Create a sub-agent account and share their store link</p>
        </div>

        <div className="card">
          {/* ✅ autocomplete="off" on form prevents browser from auto-filling */}
          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

            {/* Email — readOnly + onFocus trick blocks browser autofill */}
            <div>
              {lbl('Agent Email', true)}
              <input
                type="email"
                name="new-invite-email"
                autoComplete="new-password"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={inp}
                placeholder="newagent@example.com"
                readOnly
                onFocus={e => e.target.removeAttribute('readonly')}
                required
              />
            </div>

            {/* Password — same trick */}
            <div>
              {lbl('Password', true)}
              <input
                type="password"
                name="new-invite-password"
                autoComplete="new-password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                style={inp}
                placeholder="Min 6 characters"
                readOnly
                onFocus={e => e.target.removeAttribute('readonly')}
                required
                minLength="6"
              />
            </div>

            {/* Phone + Store name in a row on wider screens */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
              <div>
                {lbl('Phone Number')}
                <input
                  type="tel"
                  autoComplete="off"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  style={inp}
                  placeholder="0240000000"
                />
              </div>
              <div>
                {lbl('Store Name')}
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.store_name}
                  onChange={e => setFormData({ ...formData, store_name: e.target.value })}
                  style={inp}
                  placeholder="e.g. Kwame's Data Store"
                />
              </div>
            </div>

            {/* Result panel */}
            {result && (
              <div style={{ padding: '1rem', borderRadius: '0.75rem', background: result.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: result.success ? 'var(--success)' : 'var(--danger)' }}>
                <p style={{ fontWeight: '700', marginBottom: result.storeLink ? '0.875rem' : 0 }}>{result.message}</p>
                {result.storeLink && (
                  <>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Store Link:</p>
                    <div style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                      {result.storeLink}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => copy(result.storeLink, 'Store link copied!')} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                        📋 Copy Store Link
                      </button>
                      {result.email && (
                        <button type="button" onClick={() => copy(`Email: ${result.email}\nStore: ${result.storeLink}`, 'Details copied!')} style={{ padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          📋 Copy All Details
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '0.25rem' }}>
              {loading ? 'Creating account...' : '➕ Create Agent Account'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AgentInvite;
