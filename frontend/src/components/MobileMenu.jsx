import { useState, useEffect } from 'react';
import { useAuth }       from '../context/AuthContext';
import { useTheme }      from '../context/ThemeContext';
import { useNavigate }   from 'react-router-dom';
import api               from '../api/axios';

const verifyLockPassword = async (password) => {
  try {
    const r = await api.post('/lock-activities/verify', { lockPassword: password });
    return { success: true, tempToken: r.data.tempToken };
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Invalid password' };
  }
};

const MobileMenu = ({ currentPage }) => {
  const [isOpen,         setIsOpen]         = useState(false);
  const [showMinModal,   setShowMinModal]    = useState(false);
  const [showStoreModal, setShowStoreModal]  = useState(false);
  const [showWaModal,      setShowWaModal]     = useState(false);
  const [showTgModal,      setShowTgModal]     = useState(false);
  const [showHelpEmailModal, setShowHelpEmailModal] = useState(false);
  const [showLockModal,    setShowLockModal]   = useState(false);
  const [minAmount,        setMinAmount]       = useState('');
  const [storeName,        setStoreName]       = useState('');
  const [waLink,           setWaLink]          = useState('');
  const [tgLink,           setTgLink]          = useState('');
  const [helpCenterEmail,  setHelpCenterEmail] = useState('');
  const [saving,           setSaving]          = useState(false);

  // Lock activities state
  const [lockEnabled,     setLockEnabled]      = useState(false);
  const [oldLockPassword, setOldLockPassword]  = useState('');
  const [newLockPassword, setNewLockPassword]  = useState('');
  const [confirmPassword, setConfirmPassword]  = useState('');
  const [accountPassword, setAccountPassword]  = useState('');
  const [lockStep,        setLockStep]         = useState('status'); // 'status', 'setup', 'toggle', 'change'

  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme }       = useTheme();
  const navigate                     = useNavigate();

  useEffect(() => {
    if (user?.store_name) setStoreName(user.store_name);
  }, [user]);

  useEffect(() => {
    if (user) loadLockStatus();
  }, [user]);

  // ✅ Load previous link values when admin opens the modals
  const openWaModal = async () => {
    try {
      const r = await api.get('/admin/settings');
      setWaLink(r.data.settings?.whatsapp_group_link || '');
    } catch { setWaLink(''); }
    setShowWaModal(true);
    close();
  };

  const openTgModal = async () => {
    try {
      const r = await api.get('/admin/settings');
      setTgLink(r.data.settings?.telegram_link || '');
    } catch { setTgLink(''); }
    setShowTgModal(true);
    close();
  };

  const openHelpEmailModal = async () => {
    try {
      const r = await api.get('/admin/settings');
      setHelpCenterEmail(r.data.settings?.help_center_email || '');
    } catch { setHelpCenterEmail(''); }
    setShowHelpEmailModal(true);
    close();
  };

  const secureAction = async (action) => {
    if (!lockEnabled) {
      action();
      return;
    }

    const password = window.prompt('Enter your lock activities password to continue');
    if (!password) return;

    const result = await verifyLockPassword(password);
    if (!result.success) {
      alert(result.error);
      return;
    }

    action();
  };

  const close = () => setIsOpen(false);
  const go    = (path) => { navigate(path); close(); };
  const handleLogout = () => { logout(); navigate('/login'); close(); };

  // ── Admin menu ──────────────────────────────────────────────
  const adminItems = [
    { label: 'Dashboard',          path: '/admin/dashboard',          icon: '🎛️' },
    { label: 'Users',              path: '/admin/users',              icon: '👥', requiresLock: true },
    { label: 'Suspended Agents',   path: '/admin/suspended-agents',   icon: '🚫', requiresLock: true },
    { label: 'Auto Withdrawals',   path: '/admin/withdrawals',        icon: '💰', requiresLock: true },
    { label: 'Manual Withdrawals', path: '/admin/manual-withdrawals', icon: '📋', requiresLock: true },
    { label: 'Packages',           path: '/admin/packages',           icon: '📦', requiresLock: true },
    { label: 'Orders',             path: '/admin/orders',             icon: '📊' },
    { label: 'Audit Logs',         path: '/admin/audit-logs',         icon: '📋', requiresLock: true },
    { label: 'Profile',            path: '/profile',                  icon: '👤' },
  ];

  // ── Agent menu — ✅ includes Withdrawal History ──────────────
  const agentItems = [
    { label: 'Dashboard',           path: '/agent/dashboard',           icon: '🏠' },
    { label: 'Set Prices',          path: '/agent/set-prices',          icon: '💲', requiresLock: true },
    { label: 'Withdraw',            path: '/agent/withdraw',            icon: '💵', requiresLock: true },
    { label: 'Withdrawal History',  path: '/agent/withdrawal-history',  icon: '🧾' },
    { label: 'Statistics',          path: '/agent/statistics',          icon: '📈' },
    { label: 'Invite Agent',        path: '/agent/invite',              icon: '📨', requiresLock: true },
    { label: 'Terms/Rules',         path: '/agent/terms',               icon: '📋' },
    { label: 'My Store',            path: `/store/${user?.store_slug}`, icon: '🏪', external: true },
    { label: 'Profile',             path: '/profile',                   icon: '👤' },
  ];

  const menuItems = user?.role === 'admin' ? adminItems : agentItems;

  // ── Admin saves ─────────────────────────────────────────────
  const saveMinWithdrawal = async () => {
    if (!minAmount || isNaN(parseFloat(minAmount))) return;
    setSaving(true);
    try {
      await api.put('/admin/settings/min-withdrawal', { amount: parseFloat(minAmount) });
      alert(`✅ Minimum withdrawal updated to GH₵ ${parseFloat(minAmount).toFixed(2)}`);
      setShowMinModal(false); setMinAmount('');
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveWaLink = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings/whatsapp-group', { link: waLink });
      alert('✅ WhatsApp group link saved');
      setShowWaModal(false);
    } catch { alert('Failed'); }
    finally { setSaving(false); }
  };

  const saveTgLink = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings/telegram-link', { link: tgLink });
      alert('✅ Telegram link saved');
      setShowTgModal(false);
    } catch { alert('Failed'); }
    finally { setSaving(false); }
  };

  const saveHelpCenterEmail = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings/help-center-email', { email: helpCenterEmail });
      alert('✅ Help center email saved');
      setShowHelpEmailModal(false);
    } catch { alert('Failed'); }
    finally { setSaving(false); }
  };

  const saveStoreName = async () => {
    if (!storeName.trim()) return;
    setSaving(true);
    try {
      const r = await api.put('/agent/store-name', { store_name: storeName.trim() });
      updateUser({ store_name: r.data.store_name, store_slug: r.data.store_slug });
      alert('✅ Store name updated!');
      setShowStoreModal(false);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  // ── Lock Activities ──────────────────────────────────────
  const loadLockStatus = async () => {
    try {
      const r = await api.get('/lock-activities/status');
      setLockEnabled(r.data.is_enabled);
      // If password is not set, go directly to setup; otherwise show status
      setLockStep(!r.data.password_set ? 'setup' : 'status');
    } catch (err) {
      console.error('Failed to load lock status:', err);
      setLockStep('setup');
    }
  };

  const openLockModal = async () => {
    await loadLockStatus();
    setShowLockModal(true);
    close();
  };

  const setupLockPassword = async () => {
    if (!newLockPassword || newLockPassword.length < 4) {
      alert('Lock password must be at least 4 characters');
      return;
    }
    if (newLockPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!accountPassword) {
      alert('Please enter your account password');
      return;
    }

    setSaving(true);
    try {
      await api.post('/lock-activities/set-password', {
        accountPassword,
        lockPassword: newLockPassword,
        confirmPassword
      });
      setLockEnabled(true);
      setLockStep('status');
      alert('✅ Lock activities password set successfully!');
      setNewLockPassword('');
      setConfirmPassword('');
      setAccountPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set lock password');
    } finally { setSaving(false); }
  };

  const toggleLockActivities = async () => {
    if (!oldLockPassword || oldLockPassword.trim() === '') {
      alert('Lock password is required to toggle lock activities');
      return;
    }

    setSaving(true);
    try {
      await api.post('/lock-activities/toggle', {
        lockPassword: oldLockPassword,
        enabled: !lockEnabled
      });
      setLockEnabled(!lockEnabled);
      setOldLockPassword('');
      alert(`✅ Lock activities ${!lockEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle lock activities');
      setOldLockPassword('');
    } finally { setSaving(false); }
  };

  const changeLockPassword = async () => {
    if (!oldLockPassword || !newLockPassword || newLockPassword !== confirmPassword) {
      alert('Please fill in all fields correctly');
      return;
    }

    setSaving(true);
    try {
      await api.put('/lock-activities/change-password', {
        oldPassword: oldLockPassword,
        newPassword: newLockPassword,
        confirmPassword
      });
      alert('✅ Lock password changed successfully!');
      setLockStep('status');
      setOldLockPassword('');
      setNewLockPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change lock password');
    } finally { setSaving(false); }
  };

  // ── Shared styles ───────────────────────────────────────────
  const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' };
  const cardStyle    = { background:'var(--card-bg)', borderRadius:'1rem', padding:'1.5rem', width:'100%', maxWidth:'380px', border:'1px solid var(--border-color)', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', animation:'popUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' };
  const inputStyle   = { width:'100%', padding:'0.75rem 1rem', border:'1px solid var(--border-color)', borderRadius:'0.5rem', background:'var(--bg-secondary)', color:'var(--text-primary)', fontSize:'0.95rem', marginTop:'0.75rem' };
  const btnRow       = { display:'flex', gap:'0.75rem', marginTop:'1rem' };
  const cancelBtn    = { flex:1, padding:'0.75rem', background:'var(--bg-tertiary)', border:'1px solid var(--border-color)', borderRadius:'0.5rem', color:'var(--text-primary)', cursor:'pointer', fontWeight:'600' };

  const itemStyle = (active) => ({
    width:'100%', display:'flex', alignItems:'center', gap:'0.875rem',
    padding:'0.875rem 1rem', background:active ? 'var(--bg-secondary)':'none',
    border:'none', borderRadius:'0.5rem', color:'var(--text-primary)',
    fontSize:'0.95rem', fontWeight:active ? '700':'400', cursor:'pointer',
    textAlign:'left', transition:'background 0.15s',
  });

  return (
    <>
      {/* Sticky header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.875rem 1.25rem', background:'var(--card-bg)', borderBottom:'1px solid var(--border-color)', position:'sticky', top:0, zIndex:1000, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontWeight:'800', fontSize:'1rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          {user?.role === 'admin' ? '🎛️ Admin' : `🏪 ${user?.store_name || 'Agent'}`}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <button onClick={toggleTheme} style={{ background:'none', border:'none', color:'var(--text-primary)', fontSize:'1.3rem', cursor:'pointer', padding:'0.2rem 0.35rem', lineHeight:1, width:'2.3rem', height:'2.3rem', display:'grid', placeItems:'center' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setIsOpen(o => !o)} style={{ background:'none', border:'none', color:'var(--text-primary)', fontSize:'1.5rem', cursor:'pointer', padding:'0.25rem 0.5rem', lineHeight:1 }}>
            {isOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Slide-up drawer */}
      {isOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, display:'flex', flexDirection:'column', justifyContent:'flex-end' }} onClick={close}>
          <div style={{ background:'var(--card-bg)', borderRadius:'1.25rem 1.25rem 0 0', padding:'1.25rem', maxHeight:'88vh', overflowY:'auto', animation:'slideUp 0.28s ease' }} onClick={e => e.stopPropagation()}>

            <div style={{ width:'40px', height:'4px', background:'var(--border-color)', borderRadius:'2px', margin:'0 auto 1.25rem' }} />

            {/* User info */}
            <div style={{ padding:'1rem', background:'var(--bg-secondary)', borderRadius:'0.875rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.875rem' }}>
              <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
                {user?.role === 'admin' ? '🎛️' : '👤'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:'700', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username || user?.email?.split('@')[0]}</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
              </div>
              <span style={{ padding:'0.2rem 0.6rem', background:user?.role==='admin'?'rgba(139,92,246,0.2)':'rgba(59,130,246,0.2)', color:user?.role==='admin'?'#8b5cf6':'#3b82f6', borderRadius:'9999px', fontSize:'0.7rem', fontWeight:'700', textTransform:'uppercase', flexShrink:0 }}>
                {user?.role}
              </span>
            </div>

            {/* Nav items */}
            <div style={{ display:'flex', flexDirection:'column', gap:'0.2rem', marginBottom:'1rem' }}>
              {menuItems.map((item) => (
                <button key={item.label}
                  onClick={() => {
                    const execute = () => {
                      if (item.action) {
                        item.action();
                        return;
                      }
                      if (item.external) {
                        window.open(item.path, '_blank');
                      } else {
                        go(item.path);
                      }
                    };

                    if (item.requiresLock && item.path) {
                      go(item.path);
                    } else if (item.requiresLock) {
                      secureAction(execute);
                    } else {
                      execute();
                    }
                  }}
                  style={itemStyle(currentPage === item.path)}
                >
                  <span style={{ fontSize:'1.15rem', width:'24px', textAlign:'center' }}>{item.icon}</span>
                  <span>{item.label}{item.requiresLock ? (lockEnabled ? ' 🔒' : ' 🔓') : ''}</span>
                </button>
              ))}
            </div>

            {/* Admin: navigation sections */}
            {user?.role === 'admin' && (
              <div style={{ borderTop:'1px solid var(--border-color)', paddingTop:'0.875rem', marginBottom:'0.875rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
                    <div>
                  <p style={{ fontSize:'0.7rem', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', padding:'0 1rem 0.25rem' }}>Platform</p>
                  {[
                    { label: '📜 Terms/Rules',     action: () => go('/admin/terms'), needsLock: true },
                    { label: '💰 Min Withdrawal',  action: () => go('/admin/lock-action/min-withdrawal'), needsLock: true },
                  ].map(b => (
                    <button key={b.label} onClick={b.action} style={itemStyle(false)}>{b.label}{b.needsLock ? (lockEnabled ? ' 🔒' : ' 🔓') : ''}</button>
                  ))}
                </div>

                <div>
                  <p style={{ fontSize:'0.7rem', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', padding:'0 1rem 0.25rem' }}>Support Links</p>
                  {[
                    { label: '💬 WhatsApp Group',   action: () => go('/admin/lock-action/whatsapp-group'), needsLock: true },
                    { label: '✈️ Telegram Link',   action: () => go('/admin/lock-action/telegram-link'), needsLock: true },
                    { label: '📧 Help Center Email', action: () => go('/admin/lock-action/help-center-email'), needsLock: true },
                  ].map(b => (
                    <button key={b.label} onClick={b.action} style={itemStyle(false)}>{b.label}{b.needsLock ? (lockEnabled ? ' 🔒' : ' 🔓') : ''}</button>
                  ))}
                </div>

                <div>
                  <p style={{ fontSize:'0.7rem', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', padding:'0 1rem 0.25rem' }}>Security</p>
                  <button onClick={openLockModal} style={itemStyle(false)}>
                    <span style={{ fontSize:'1.15rem', width:'24px', textAlign:'center' }}>🔒</span>
                    <span>Lock Activities</span>
                  </button>
                </div>
              </div>
            )}

            {/* Agent: store name & lock activities */}
            {user?.role === 'agent' && (
              <div style={{ borderTop:'1px solid var(--border-color)', paddingTop:'0.875rem', marginBottom:'0.875rem', display:'flex', flexDirection:'column', gap:'0.2rem' }}>
                <button onClick={() => secureAction(() => { setShowStoreModal(true); close(); })} style={itemStyle(false)}>
                  <span style={{ fontSize:'1.15rem', width:'24px', textAlign:'center' }}>🏷️</span>
                  <span>Change Store Name {lockEnabled ? '🔒' : '🔓'}</span>
                </button>
                <button onClick={openLockModal} style={itemStyle(false)}>
                  <span style={{ fontSize:'1.15rem', width:'24px', textAlign:'center' }}>🔒</span>
                  <span>Lock Activities</span>
                </button>
              </div>
            )}

            {/* Logout */}
            <button onClick={handleLogout} style={{ width:'100%', padding:'0.875rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'0.625rem', color:'var(--danger)', fontSize:'0.95rem', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
              🚪 Logout
            </button>
          </div>
        </div>
      )}

      {/* Min Withdrawal Modal */}
      {showMinModal && (
        <div style={overlayStyle} onClick={() => setShowMinModal(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight:'700' }}>💰 Set Minimum Withdrawal</h3>
            <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>Agents will be notified of the change.</p>
            <input type="number" step="0.01" min="0" value={minAmount} onChange={e => setMinAmount(e.target.value)} style={inputStyle} placeholder="e.g. 10.00" autoFocus />
            <div style={btnRow}>
              <button onClick={() => setShowMinModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={saveMinWithdrawal} disabled={saving} style={{ flex:2, padding:'0.75rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:'0.5rem', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>{saving?'Saving...':'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal — ✅ loads previous value */}
      {showWaModal && (
        <div style={overlayStyle} onClick={() => setShowWaModal(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight:'700' }}>💬 WhatsApp Group Link</h3>
            <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>Edit or replace the current link. Agents will be notified.</p>
            <input type="url" value={waLink} onChange={e => setWaLink(e.target.value)} style={inputStyle} placeholder="https://chat.whatsapp.com/..." autoFocus />
            <div style={btnRow}>
              <button onClick={() => setShowWaModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={saveWaLink} disabled={saving} style={{ flex:2, padding:'0.75rem', background:'linear-gradient(135deg,#25d366,#128c7e)', color:'white', border:'none', borderRadius:'0.5rem', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>{saving?'Saving...':'Save Link'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Modal — ✅ loads previous value */}
      {showTgModal && (
        <div style={overlayStyle} onClick={() => setShowTgModal(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight:'700' }}>✈️ Telegram Link</h3>
            <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>Edit or replace the current link. Agents will be notified.</p>
            <input type="url" value={tgLink} onChange={e => setTgLink(e.target.value)} style={inputStyle} placeholder="https://t.me/..." autoFocus />
            <div style={btnRow}>
              <button onClick={() => setShowTgModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={saveTgLink} disabled={saving} style={{ flex:2, padding:'0.75rem', background:'linear-gradient(135deg,#0088cc,#006aaa)', color:'white', border:'none', borderRadius:'0.5rem', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>{saving?'Saving...':'Save Link'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Help Center Email Modal */}
      {showHelpEmailModal && (
        <div style={overlayStyle} onClick={() => setShowHelpEmailModal(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight:'700' }}>📧 Help Center Email</h3>
            <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>Set the email address agents and users should contact for support.</p>
            <input type="email" value={helpCenterEmail} onChange={e => setHelpCenterEmail(e.target.value)} style={inputStyle} placeholder="help@example.com" autoFocus />
            <div style={btnRow}>
              <button onClick={() => setShowHelpEmailModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={saveHelpCenterEmail} disabled={saving} style={{ flex:2, padding:'0.75rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:'0.5rem', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>{saving?'Saving...':'Save Email'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Store Name Modal */}
      {showStoreModal && (
        <div style={overlayStyle} onClick={() => setShowStoreModal(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight:'700' }}>🏷️ Change Store Name</h3>
            <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>This also updates your store URL.</p>
            <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} style={inputStyle} placeholder="e.g. Kwame's Data Store" autoFocus />
            <div style={btnRow}>
              <button onClick={() => setShowStoreModal(false)} style={cancelBtn}>Cancel</button>
              <button onClick={saveStoreName} disabled={saving} style={{ flex:2, padding:'0.75rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:'0.5rem', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>{saving?'Saving...':'Update'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Activities Modal */}
      {showLockModal && (
        <div style={overlayStyle} onClick={() => setShowLockModal(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight:'700' }}>🔒 Lock Activities</h3>
            <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>
              {lockStep === 'setup' ? 'Set up a lock password to protect your sensitive activities.' :
               lockStep === 'status' ? 'Manage your lock activities protection.' :
               'Enter your lock password to proceed.'}
            </p>

            {lockStep === 'status' && (
              <div style={{ marginTop:'1rem' }}>
                <div style={{ padding:'1rem', background:'var(--bg-secondary)', borderRadius:'0.5rem', marginBottom:'1rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                    <span style={{ fontWeight:'600' }}>Status:</span>
                    <span style={{ color:lockEnabled?'var(--success)':'var(--text-muted)', fontWeight:'700' }}>
                      {lockEnabled ? '🔓 Enabled' : '🔒 Disabled'}
                    </span>
                  </div>
                  <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)', margin:0 }}>
                    {lockEnabled ? 'Your sensitive activities are protected with a lock password.' : 'Set up a lock password to protect withdrawals and other sensitive actions.'}
                  </p>
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button onClick={() => setLockStep('change')} style={{ flex:1, padding:'0.75rem', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'0.5rem', color:'var(--primary)', cursor:'pointer', fontWeight:'700', fontSize:'0.85rem' }}>
                    🔄 Change Password
                  </button>
                  <button onClick={() => setLockStep('toggle')} style={{ flex:1, padding:'0.75rem', background:lockEnabled?'rgba(239,68,68,0.1)':'rgba(16,185,129,0.1)', border:`1px solid ${lockEnabled?'rgba(239,68,68,0.3)':'rgba(16,185,129,0.3)'}`, borderRadius:'0.5rem', color:lockEnabled?'var(--danger)':'var(--success)', cursor:'pointer', fontWeight:'700', fontSize:'0.85rem' }}>
                    {lockEnabled ? '🔓 Disable' : '🔒 Enable'}
                  </button>
                </div>
              </div>
            )}

            {(lockStep === 'setup' || lockStep === 'change') && (
              <div style={{ marginTop:'1rem' }}>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'600', marginBottom:'0.25rem' }}>
                    {lockStep === 'setup' ? 'Account Password' : 'Current Lock Password'}
                  </label>
                  <input
                    type="password"
                    value={lockStep === 'setup' ? accountPassword : oldLockPassword}
                    onChange={e => lockStep === 'setup' ? setAccountPassword(e.target.value) : setOldLockPassword(e.target.value)}
                    style={inputStyle}
                    placeholder={lockStep === 'setup' ? 'Enter your account password' : 'Enter your current lock password'}
                  />
                </div>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'600', marginBottom:'0.25rem' }}>New Lock Password</label>
                  <input type="password" value={newLockPassword} onChange={e => setNewLockPassword(e.target.value)} style={inputStyle} placeholder="At least 4 characters" />
                </div>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'600', marginBottom:'0.25rem' }}>Confirm New Lock Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Confirm your lock password" />
                </div>
                <button onClick={lockStep === 'setup' ? setupLockPassword : changeLockPassword} disabled={saving || !newLockPassword || !confirmPassword || (lockStep === 'setup' ? !accountPassword : !oldLockPassword)} style={{ width:'100%', padding:'0.875rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:'0.5rem', cursor:'pointer', fontWeight:'700', opacity:(saving || !newLockPassword || !confirmPassword || (lockStep === 'setup' ? !accountPassword : !oldLockPassword))?0.7:1 }}>
                  {saving ? 'Saving...' : `🔒 ${lockStep === 'setup' ? 'Set' : 'Change'} Lock Password`}
                </button>
              </div>
            )}

            {lockStep === 'toggle' && (
              <div style={{ marginTop:'1rem' }}>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'600', marginBottom:'0.25rem' }}>Lock Password</label>
                  <input type="password" value={oldLockPassword} onChange={e => setOldLockPassword(e.target.value)} style={inputStyle} placeholder="Enter your lock password" />
                </div>
                <button onClick={toggleLockActivities} disabled={saving || !oldLockPassword} style={{ width:'100%', padding:'0.875rem', background:lockEnabled?'rgba(239,68,68,0.1)':'rgba(16,185,129,0.1)', border:`1px solid ${lockEnabled?'rgba(239,68,68,0.3)':'rgba(16,185,129,0.3)'}`, borderRadius:'0.5rem', color:lockEnabled?'var(--danger)':'var(--success)', cursor:'pointer', fontWeight:'700', opacity:(saving || !oldLockPassword)?0.7:1 }}>
                  {saving ? 'Processing...' : `🔒 ${lockEnabled ? 'Disable' : 'Enable'} Lock Activities`}
                </button>
                <button onClick={() => { setShowLockModal(false); close(); navigate('/reset-lock-password'); }} style={{ marginTop:'0.75rem', width:'100%', padding:'0.75rem', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'0.5rem', color:'var(--primary)', cursor:'pointer', fontWeight:'700' }}>
                  ❓ Forgot lock password?
                </button>
              </div>
            )}

            <div style={btnRow}>
              <button onClick={() => { setShowLockModal(false); setLockStep('status'); setOldLockPassword(''); setNewLockPassword(''); setConfirmPassword(''); setAccountPassword(''); }} style={cancelBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes popUp   { from { transform:scale(0.88); opacity:0; } to { transform:scale(1); opacity:1; } }
      `}</style>
    </>
  );
};

export default MobileMenu;
export { verifyLockPassword };
