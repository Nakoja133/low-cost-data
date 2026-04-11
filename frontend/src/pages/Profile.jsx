import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import MobileMenu from '../components/MobileMenu';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate             = useNavigate();
  const isAdmin              = user?.role === 'admin';

  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState({ type: '', text: '', section: '' });

  // ── Profile fields ────────────────────────────────────────────
  const [profileData, setProfileData] = useState({ username: '', phone: '', whatsapp_number: '' });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [emailData,    setEmailData]    = useState({ new_email: '', current_password: '', verification_code: '' });
  const [emailStep,    setEmailStep]    = useState(1);

  // ── Agent: store name ─────────────────────────────────────────
  const [storeName,  setStoreName]  = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({ username: user.username || '', phone: user.phone || '', whatsapp_number: user.whatsapp_number || '' });
      setStoreName(user.store_name || '');
    }
  }, [user]);

  const showMsg = (type, text, section) => {
    setMessage({ type, text, section });
    setTimeout(() => setMessage({ type: '', text: '', section: '' }), 5000);
  };

  // ── Update profile ────────────────────────────────────────────
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.put('/auth/profile', {
        username:        profileData.username        || null,
        phone:           profileData.phone           || null,
        whatsapp_number: profileData.whatsapp_number || null,
      });
      if (r.data.user) updateUser(r.data.user);
      showMsg('success', 'Profile updated successfully!', 'profile');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to update profile', 'profile');
    } finally { setLoading(false); }
  };

  // ── Change password ───────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      showMsg('error', 'New passwords do not match', 'password'); return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password:     passwordData.new_password,
      });
      showMsg('success', 'Password changed successfully!', 'password');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to change password', 'password');
    } finally { setLoading(false); }
  };

  // ── Request email change ──────────────────────────────────────
  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/request-email-change', {
        new_email:        emailData.new_email,
        current_password: emailData.current_password,
      });
      showMsg('success', r.data.message || 'Verification code sent!', 'email');
      setEmailStep(2);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to request email change', 'email');
    } finally { setLoading(false); }
  };

  // ── Confirm email change ──────────────────────────────────────
  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/confirm-email-change', { code: emailData.verification_code });
      updateUser({ email: r.data.new_email });
      showMsg('success', `Email changed: ${r.data.old_email} → ${r.data.new_email}`, 'email');
      setEmailData({ new_email: '', current_password: '', verification_code: '' });
      setEmailStep(1);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Invalid or expired code', 'email');
    } finally { setLoading(false); }
  };

  // ── Agent: update store name ──────────────────────────────────
  const handleSaveStoreName = async () => {
    if (!storeName.trim()) { showMsg('error', 'Store name cannot be empty', 'store'); return; }
    setSavingName(true);
    try {
      await api.put('/agent/store-name', { store_name: storeName.trim() });
      updateUser({ store_name: storeName.trim() });
      showMsg('success', 'Store name updated!', 'store');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to update store name', 'store');
    } finally { setSavingName(false); }
  };

  // ── Admin: save platform settings ────────────────────────────
  // Removed - now only in mobile menu

  // ── Shared helpers ────────────────────────────────────────────
  const label  = (text, req) => (
    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
      {text} {req && <span style={{ color: 'var(--danger)' }}>*</span>}
    </label>
  );

  const Msg = ({ section }) => message.section === section && message.text ? (
    <div style={{ padding: '0.875rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: '600', fontSize: '0.875rem' }}>
      {message.text}
    </div>
  ) : null;

  const Section = ({ title, children, extra }) => (
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        {extra}
      </div>
      {children}
    </div>
  );

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/profile" />

      <main className="main-content" style={{ paddingTop: '1rem', maxWidth: '640px' }}>

        {/* ── Page header ─────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', color: 'white' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{isAdmin ? '🎛️' : '👤'}</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.2rem' }}>
            {isAdmin ? 'Admin Profile & Settings' : 'Profile Settings'}
          </h2>
          <p style={{ opacity: 0.88, fontSize: '0.875rem' }}>Manage your account and preferences</p>
        </div>

        <div className="card">

          {/* ── Account Information ─────────────────────── */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>📝 Account Information</h3>
          <Msg section="profile" />
          <form onSubmit={handleUpdateProfile} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              {label('Email')}
              <input type="email" value={user?.email || ''} disabled className="input" style={{ background: 'var(--bg-tertiary)', cursor: 'not-allowed', color: 'var(--text-muted)' }} />
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Use "Change Email" below to update your email</p>
            </div>
            <div>
              {label('Username')}
              <input type="text" value={profileData.username} onChange={e => setProfileData({ ...profileData, username: e.target.value })} className="input" placeholder="Your display name" autoComplete="off" />
            </div>
            <div>
              {label('Phone Number')}
              <input type="tel" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} className="input" placeholder="0240000000" autoComplete="off" />
            </div>
            <div>
              {label('WhatsApp Number')}
              <input type="tel" value={profileData.whatsapp_number} onChange={e => setProfileData({ ...profileData, whatsapp_number: e.target.value })} className="input" placeholder="233240000000" autoComplete="off" />
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Include country code — e.g. 233 for Ghana</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}>
              {loading ? 'Updating...' : '💾 Save Profile'}
            </button>
          </form>

          {/* ── Agent: Store Settings ───────────────────── */}
          {!isAdmin && (
            <Section title="🏪 Store Settings">
              <Msg section="store" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  {label('Store Name')}
                  <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="input" placeholder="e.g. Kwame's Data Store" autoComplete="off" />
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>This is the name displayed on your public store page</p>
                </div>
                {user?.store_slug && (
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Your Store URL</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--primary)', wordBreak: 'break-all' }}>
                      {window.location.origin}/store/{user.store_slug}
                    </p>
                  </div>
                )}
                <button onClick={handleSaveStoreName} disabled={savingName} className="btn-primary" style={{ justifyContent: 'center', padding: '0.875rem' }}>
                  {savingName ? 'Saving...' : '💾 Save Store Name'}
                </button>
              </div>
            </Section>
          )}

          {/* ── Change Email ─────────────────────────────── */}
          <Section title="📧 Change Email">
            <Msg section="email" />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>You must verify ownership with your current password.</p>
            {emailStep === 1 ? (
              <form onSubmit={handleRequestEmailChange} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div>
                  {label('New Email Address', true)}
                  <input type="email" value={emailData.new_email} onChange={e => setEmailData({ ...emailData, new_email: e.target.value })} className="input" placeholder="newemail@example.com" autoComplete="off" required />
                </div>
                <div>
                  {label('Current Password', true)}
                  {/* ✅ FIX: readOnly trick prevents browser from auto-filling saved credentials */}
                  <input
                    type="password"
                    value={emailData.current_password}
                    onChange={e => setEmailData({ ...emailData, current_password: e.target.value })}
                    className="input"
                    placeholder="Enter your current password"
                    autoComplete="off"
                    readOnly
                    onFocus={e => e.target.removeAttribute('readonly')}
                    required
                  />
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Required to confirm you own this account — type it manually</p>
                </div>
                <button type="submit" disabled={loading || !emailData.new_email || !emailData.current_password} className="btn-primary" style={{ justifyContent: 'center', padding: '0.875rem', opacity: !emailData.new_email || !emailData.current_password ? 0.6 : 1 }}>
                  {loading ? 'Sending...' : '📨 Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmailChange} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div style={{ padding: '0.875rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.5rem', fontSize: '0.875rem', color: 'var(--info)' }}>
                  ✅ Code sent to <strong>{emailData.new_email}</strong>. Expires in 15 minutes. Check spam if not received.
                </div>
                <div>
                  {label('6-Digit Verification Code', true)}
                  <input
                    type="text"
                    value={emailData.verification_code}
                    onChange={e => setEmailData({ ...emailData, verification_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="input"
                    placeholder="123456"
                    maxLength="6"
                    required
                    autoComplete="off"
                    style={{ letterSpacing: '0.5rem', fontSize: '1.3rem', textAlign: 'center', fontWeight: '700' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" disabled={loading || emailData.verification_code.length !== 6} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.875rem', background: 'linear-gradient(135deg,#10b981,#059669)', opacity: emailData.verification_code.length !== 6 ? 0.6 : 1 }}>
                    {loading ? 'Verifying...' : '✅ Confirm'}
                  </button>
                  <button type="button" onClick={() => { setEmailStep(1); setEmailData({ new_email: '', current_password: '', verification_code: '' }); setMessage({ type: '', text: '', section: '' }); }} style={{ padding: '0.875rem 1.25rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Section>

          {/* ── Change Password ──────────────────────────── */}
          <Section title="🔐 Change Password">
            <Msg section="password" />
            <form onSubmit={handleChangePassword} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div>
                {label('Current Password', true)}
                <input type="password" value={passwordData.current_password} onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })} className="input" placeholder="••••••••" autoComplete="off" readOnly onFocus={e => e.target.removeAttribute('readonly')} required />
              </div>
              <div>
                {label('New Password', true)}
                <input type="password" value={passwordData.new_password} onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })} className="input" placeholder="Min 6 characters" autoComplete="new-password" minLength="6" required />
              </div>
              <div>
                {label('Confirm New Password', true)}
                <input type="password" value={passwordData.confirm_password} onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })} className="input" placeholder="••••••••" autoComplete="new-password" required />
                {passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
                  <p style={{ fontSize: '0.73rem', color: 'var(--danger)', marginTop: '0.25rem' }}>⚠️ Passwords don't match</p>
                )}
              </div>
              <button type="submit" disabled={loading || !passwordData.current_password || !passwordData.new_password || passwordData.new_password !== passwordData.confirm_password} className="btn-primary" style={{ justifyContent: 'center', padding: '0.875rem', background: 'linear-gradient(135deg,#f59e0b,#d97706)', opacity: (!passwordData.current_password || !passwordData.new_password || passwordData.new_password !== passwordData.confirm_password) ? 0.6 : 1 }}>
              {loading ? 'Changing...' : '🔐 Change Password'}
              </button>
            </form>
          </Section>

        </div>
      </main>
    </div>
  );
};

export default Profile;
