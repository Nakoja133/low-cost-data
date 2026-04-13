import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const RANGE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

const AgentDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const { showError } = useFeedback();
  const navigate = useNavigate();
  
  const [showTerms, setTermsContent] = useState('');
  const [accepting, setAccepting] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [notifIdx, setNotifIdx] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  
  const [walletData, setWalletData] = useState({ balance: 0, available: 0, pending_withdrawals: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, totalProfit: 0 });
  
  const [groupLink, setGroupLink] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [helpCenterEmail, setHelpCenterEmail] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  const statsRange = localStorage.getItem('agent_stats_range') || 'weekly';
  const rangeLabel = RANGE_LABELS[statsRange];
  const storeUrl = user?.store_slug ? `${window.location.origin}/store/${user.store_slug}` : '';

  useEffect(() => {
    if (user?.terms_accepted === false) {
      api.get('/agent/terms')
        .then(r => { setTermsContent(r.data.terms || 'Unable to load.'); setShowTerms(true); })
        .catch(() => { setTermsContent('Unable to load.'); setShowTerms(true); });
    } else {
      loadAll();
    }
  }, []);

  const loadAll = async () => {
    try {
      const [w, o, s, sets, notifs] = await Promise.allSettled([
        api.get('/agent/wallet'),
        api.get('/agent/orders'),
        api.get(`/agent/statistics?range=${statsRange}`),
        api.get('/agent/settings').catch(() => ({ data: { settings: {} } })),
        api.get('/agent/notifications'),
      ]);

      if (w.status === 'fulfilled') setWalletData(w.value.data);
      if (o.status === 'fulfilled') setRecentOrders((o.value.data?.data || []).slice(0, 5));
      if (s.status === 'fulfilled') {
        const d = s.value.data;
        setStats({
          totalOrders: d.totalOrders || 0,
          totalRevenue: d.totalRevenue || 0,
          totalProfit: d.totalProfit || 0,
        });
      }
      if (sets.status === 'fulfilled') {
        const cfg = sets.value.data?.settings || {};
        setGroupLink(cfg.whatsapp_group_link || '');
        setTelegramLink(cfg.telegram_link || '');
        setHelpCenterEmail(cfg.help_center_email || '');
      }
      if (notifs.status === 'fulfilled' && notifs.value.data.notifications?.length) {
        setNotifications(notifs.value.data.notifications);
        setShowNotif(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const acceptTerms = async () => {
    setAccepting(true);
    try {
      await api.post('/agent/accept-terms');
      updateUser({ terms_accepted: true });
      setShowTerms(false);
      loadAll();
    } catch {
      showError('Failed to accept terms. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const dismissNotif = async () => {
    const n = notifications[notifIdx];
    try {
      await api.post('/agent/notifications/dismiss', { type: n.type });
    } catch {}
    
    if (notifIdx < notifications.length - 1) {
      setNotifIdx(i => i + 1);
    } else {
      setShowNotif(false);
      setNotifications([]);
    }
  };

  const copyLink = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const greeting = () => {
    const h = new Date().getHours();
    const n = user?.username || user?.email?.split('@')[0] || 'Agent';
    if (h < 12) return `Good morning, ${n} ☀️`;
    if (h < 17) return `Good afternoon, ${n} 👋`;
    if (h < 21) return `Good evening, ${n} 🌆`;
    return `Good night, ${n} 🌙`;
  };

  const statusColor = (s) => {
    if (s === 'completed') return 'var(--success, #10b981)';
    if (s === 'pending') return 'var(--warning, #f59e0b)';
    return 'var(--danger, #ef4444)';
  };

  const getNotifMessage = (n) => {
    if (n.type === 'terms') return 'The Terms & Rules have been updated. Please review them.';
    if (n.type === 'min_withdrawal') return `The minimum withdrawal amount has been updated to GH₵ ${n.new_amount}.`;
    if (n.type === 'package_update') return 'The available data bundles have been updated by admin. Check the latest packages.';
    if (n.type === 'link_update') return `The ${n.platform} platform link has been updated. Join to stay informed.`;
    return n.message || 'You have a new notification.';
  };

  const getNotifIcon = (n) => {
    const icons = { terms: '📋', min_withdrawal: '💰', package_update: '📦', link_update: '🔗' };
    return icons[n.type] || '🔔';
  };

  const getNotifColor = (n) => {
    const colors = {
      terms: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      min_withdrawal: 'linear-gradient(135deg,#f59e0b,#d97706)',
      package_update: 'linear-gradient(135deg,#10b981,#059669)',
      link_update: 'linear-gradient(135deg,#3b82f6,#2563eb)',
    };
    return colors[n.type] || 'linear-gradient(135deg,#6366f1,#8b5cf6)';
  };

  // ── Terms Modal ────────────────────────────────────────────────
  if (showTerms) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: 'var(--card-bg)', borderRadius: '1.25rem', width: '100%', maxWidth: '600px', border: '1px solid var(--border-color)', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '1.75rem 2rem', color: 'white' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <h2 style={{ fontWeight: '800', fontSize: '1.4rem', margin: 0 }}>Agent Terms & Conditions</h2>
            <p style={{ opacity: 0.9, fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Please read before accessing your dashboard.</p>
          </div>
          <div style={{ padding: '1.5rem 2rem', maxHeight: '45vh', overflowY: 'auto', borderBottom: '1px solid var(--border-color)' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: '1.9', color: 'var(--text-primary)', margin: 0 }}>
              {termsContent}
            </pre>
          </div>
          <div style={{ padding: '1.5rem 2rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
              Accepting means you agree to follow all rules. Declining logs you out.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                style={{ flex: 1, padding: '0.875rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.625rem', color: 'var(--danger)', fontWeight: '700', cursor: 'pointer' }}
              >
                ✕ Decline
              </button>
              <button
                onClick={acceptTerms}
                disabled={accepting}
                style={{ flex: 2, padding: '0.875rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '0.625rem', color: 'white', fontWeight: '800', cursor: 'pointer', opacity: accepting ? 0.7 : 1 }}
              >
                {accepting ? 'Saving...' : '✓ Accept & Enter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const curNotif = notifications[notifIdx];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/agent/dashboard" />

      {/* ── Notification popup ─────────────────────────────── */}
      {showNotif && curNotif && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '1.25rem', maxWidth: '400px', width: '100%', border: '1px solid var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background: getNotifColor(curNotif), padding: '1.25rem 1.5rem', color: 'white' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{getNotifIcon(curNotif)}</div>
              <p style={{ fontWeight: '800', fontSize: '1rem', margin: 0 }}>
                {greeting().split(',')[0]}, {user?.username || user?.email?.split('@')[0]}!
              </p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ color: 'var(--text-primary)', lineHeight: '1.65', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {getNotifMessage(curNotif)}
              </p>
              
              {(curNotif.type === 'terms') && (
                <button
                  onClick={() => { dismissNotif(); navigate('/agent/terms'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.5rem', padding: '0.625rem 1rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', marginBottom: '0.75rem', width: '100%', justifyContent: 'center' }}
                >
                  📋 Read Rules →
                </button>
              )}

              {(curNotif.type === 'link_update') && (groupLink || telegramLink) && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {groupLink && (
                    <a href={groupLink} target="_blank" rel="noreferrer" onClick={dismissNotif} style={{ flex: 1, padding: '0.5rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '0.5rem', color: '#25d366', textDecoration: 'none', fontWeight: '700', fontSize: '0.78rem', textAlign: 'center' }}>
                      💬 WhatsApp
                    </a>
                  )}
                  {telegramLink && (
                    <a href={telegramLink} target="_blank" rel="noreferrer" onClick={dismissNotif} style={{ flex: 1, padding: '0.5rem', background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.3)', borderRadius: '0.5rem', color: '#0088cc', textDecoration: 'none', fontWeight: '700', fontSize: '0.78rem', textAlign: 'center' }}>
                      ✈️ Telegram
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={dismissNotif}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}
              >
                Got it {notifications.length > 1 ? `(${notifIdx + 1}/${notifications.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ✅ Greeting */}
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', color: 'white', boxShadow: '0 8px 25px rgba(99,102,241,0.3)' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.25rem', margin: 0 }}>{greeting()}</h2>
          <p style={{ opacity: 0.88, fontSize: '0.875rem', margin: 0 }}>Business summary — {rangeLabel}</p>
        </div>

        {/* Wallet + Store Link */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '1rem', padding: '1.25rem', color: 'white' }}>
            <p style={{ opacity: 0.85, fontSize: '0.75rem', marginBottom: '0.25rem', margin: 0 }}>Wallet Balance</p>
            <p style={{ fontSize: '1.65rem', fontWeight: '800', lineHeight: 1, marginBottom: '0.2rem' }}>GH₵ {parseFloat(walletData.balance || 0).toFixed(2)}</p>
            {walletData.pending_withdrawals > 0 && <p style={{ opacity: 0.8, fontSize: '0.7rem', margin: 0 }}>Available: GH₵ {parseFloat(walletData.available || 0).toFixed(2)}</p>}
            <button
              onClick={() => navigate('/agent/withdraw')}
              style={{ marginTop: '0.75rem', padding: '0.45rem 1rem', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', width: '100%' }}
            >
              💵 Withdraw
            </button>
          </div>

          <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '1rem', padding: '1.25rem', color: 'white' }}>
            <p style={{ opacity: 0.85, fontSize: '0.75rem', marginBottom: '0.25rem', margin: 0 }}>{user?.store_name || 'My Store'}</p>
            <p style={{ fontSize: '0.72rem', opacity: 0.75, marginBottom: '0.625rem', wordBreak: 'break-all', lineHeight: 1.35 }}>
              {user?.store_slug ? `.../${user.store_slug}` : 'No store yet'}
            </p>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={copyLink}
                style={{ flex: 1, padding: '0.45rem 0.375rem', background: linkCopied ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem' }}
              >
                {linkCopied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              {storeUrl && (
                <button
                  onClick={() => window.open(storeUrl, '_blank')}
                  style={{ padding: '0.45rem 0.5rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ↗
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: `Orders (${rangeLabel})`, value: stats.totalOrders, unit: '', color: '#6366f1' },
            { label: `Revenue (${rangeLabel})`, value: parseFloat(stats.totalRevenue).toFixed(2), unit: 'GH₵ ', color: '#3b82f6' },
            { label: `Profit (${rangeLabel})`, value: parseFloat(stats.totalProfit).toFixed(2), unit: 'GH₵ ', color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card-bg)', borderRadius: '0.875rem', padding: '1rem 0.75rem', border: '1px solid var(--border-color)', borderTop: `3px solid ${s.color}` }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', lineHeight: 1.3, margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: '1.05rem', fontWeight: '800', color: s.color, margin: 0 }}>{s.unit}{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ marginBottom: '1.25rem', background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', marginTop: 0 }}>⚡ Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
            {[
              { icon: '🏪', label: 'My Store', sub: 'Visit to sell bundle', color: '#6366f1', action: () => storeUrl && window.open(storeUrl, '_blank') },
              { icon: '💲', label: 'Set Prices', sub: 'Manage prices', color: '#f59e0b', action: () => navigate('/agent/set-prices') },
              { icon: '📈', label: 'Statistics', sub: 'View sales data', color: '#3b82f6', action: () => navigate('/agent/statistics') },
              { icon: '💵', label: 'Withdraw', sub: 'Cash out', color: '#10b981', action: () => navigate('/agent/withdraw') },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{ padding: '1rem 0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', color: 'var(--text-primary)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${item.color}25`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>{item.icon}</div>
                <div style={{ fontWeight: '700', fontSize: '0.82rem', marginBottom: '0.2rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Platform Links */}
        {(groupLink || telegramLink || helpCenterEmail) && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🌐 Join Our Platforms
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Stay connected and get the latest updates from our community platforms.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: helpCenterEmail ? '1rem' : '0' }}>
              {groupLink && (
                <a href={groupLink} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'linear-gradient(135deg,#25d366,#128c7e)', border: 'none', borderRadius: '0.625rem', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '0.85rem', flex: '1', minWidth: '140px', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,211,102,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <span style={{ fontSize: '1.1rem' }}>💬</span>
                  WhatsApp
                </a>
              )}
              {telegramLink && (
                <a href={telegramLink} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'linear-gradient(135deg,#0088cc,#006aaa)', border: 'none', borderRadius: '0.625rem', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '0.85rem', flex: '1', minWidth: '140px', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,136,204,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <span style={{ fontSize: '1.1rem' }}>✈️</span>
                  Telegram
                </a>
              )}
            </div>
            {helpCenterEmail && (
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: '700', margin: 0 }}>📧 Help Center</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0' }}>Email us if you have a complaint or need support.</p>
                </div>
                <a href={`mailto:${helpCenterEmail}`} style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' }}>{helpCenterEmail}</a>
              </div>
            )}
          </div>
        )}

        {/* Rules reminder */}
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '0.875rem', padding: '0.875rem 1.125rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', animation: 'pulse 3s ease-in-out infinite' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ animation: 'wiggle 2.5s ease-in-out infinite', display: 'inline-block' }}>⚠️</span>
            Please always obey and follow the platform rules.
          </p>
          <button
            onClick={() => navigate('/agent/terms')}
            style={{ whiteSpace: 'nowrap', padding: '0.45rem 0.875rem', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '0.5rem', color: 'var(--warning)', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
          >
            📋 Read Rules →
          </button>
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>📦 Recent Orders</h2>
            <button onClick={() => navigate('/agent/statistics')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>View all →</button>
          </div>
          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
              <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>No orders yet</p>
              <p style={{ fontSize: '0.8rem' }}>Share your store link to start getting orders!</p>
              {storeUrl && <button onClick={copyLink} style={{ marginTop: '1rem', padding: '0.6rem 1.25rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>📋 Copy Store Link</button>}
            </div>
          ) : recentOrders.map(order => (
            <div key={order.id} style={{ padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.625rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '0.8rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.reference}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{order.customer_phone} · {new Date(order.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>GH₵ {parseFloat(order.amount_paid).toFixed(2)}</div>
                <span style={{ display: 'inline-block', padding: '0.12rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '700', marginTop: '0.15rem', background: `${statusColor(order.status)}22`, color: statusColor(order.status) }}>{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @keyframes pulse    { 0%,100%{box-shadow:0 0 0 rgba(245,158,11,0)} 50%{box-shadow:0 0 14px rgba(245,158,11,0.35)} }
        @keyframes wiggle   { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-10deg)} 75%{transform:rotate(10deg)} }
        @keyframes bounceIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        .loading-spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
      `}</style>
    </div>
  );
};

export default AgentDashboard;