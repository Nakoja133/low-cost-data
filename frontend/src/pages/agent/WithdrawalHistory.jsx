import { useState, useEffect } from 'react';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const STATUS_COLORS = {
  approved: { bg: 'rgba(16,185,129,0.12)', color: 'var(--success)' },
  pending:  { bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)' },
  rejected: { bg: 'rgba(239,68,68,0.12)',  color: 'var(--danger)'  },
};

const WithdrawalHistory = () => {
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // ✅ State for the Reason Modal
  const [reasonModal, setReasonModal] = useState({ show: false, text: '' });

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const r = await api.get('/agent/withdrawal-history');
      setHistory(r.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = history.filter(w => {
    if (filter !== 'all' && w.status !== filter)         return false;
    if (typeFilter !== 'all' && w.type !== typeFilter)   return false;
    return true;
  });

  const totals = history.reduce((acc, w) => {
    if (w.status === 'approved') acc.totalReceived += parseFloat(w.net_amount || w.amount);
    if (w.status === 'pending')  acc.totalPending  += parseFloat(w.amount);
    return acc;
  }, { totalReceived: 0, totalPending: 0 });

  // ── Modal Styles ────────────────────────────────────────────
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
  };
  const modalCard = {
    background: 'var(--card-bg)', borderRadius: '1.25rem', maxWidth: '400px', width: '100%',
    padding: '1.5rem', border: '1px solid var(--border-color)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)'
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/agent/withdrawal-history" />

      {/* ── Reason Modal ──────────────────────────────────── */}
      {reasonModal.show && (
        <div style={overlayStyle} onClick={() => setReasonModal({ show: false, text: '' })}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>⚠️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.75rem', textAlign: 'center' }}>
              Reason for the rejection
            </h3>
            <div style={{ 
              padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', 
              marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.6', textAlign: 'center',
              border: '1px solid var(--border-color)'
            }}>
              {reasonModal.text || 'No reason provided.'}
            </div>
            <button 
              onClick={() => setReasonModal({ show: false, text: '' })}
              style={{ 
                width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'white', 
                border: 'none', borderRadius: '0.625rem', fontWeight: '700', cursor: 'pointer' 
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          color: 'white',
          boxShadow: '0 8px 25px rgba(99,102,241,0.28)'
        }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.2rem', margin: 0 }}>💳 Withdrawal History</h2>
          <p style={{ opacity: 0.88, fontSize: '0.875rem', margin: 0 }}>All your withdrawal requests</p>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Requests', value: history.length, color: '#8b5cf6', unit: '' },
            { label: 'Total Received', value: totals.totalReceived.toFixed(2), color: '#10b981', unit: 'GH₵ ' },
            { label: 'Pending',        value: totals.totalPending.toFixed(2),  color: '#f59e0b', unit: 'GH₵ ' },
            { label: 'Approved',       value: history.filter(w => w.status === 'approved').length, color: '#10b981', unit: '' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--card-bg)',
              padding: '1.125rem',
              borderRadius: '0.875rem',
              border: '1px solid var(--border-color)',
              borderTop: `3px solid ${s.color}`
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{s.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: s.color }}>{s.unit}{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '0.45rem 1rem',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.8rem',
              textTransform: 'capitalize',
              background: filter === f ? 'var(--primary)' : 'var(--bg-tertiary)',
              color: filter === f ? 'white' : 'var(--text-primary)',
              transition: 'all 0.2s'
            }}>
              {f} ({f === 'all' ? history.length : history.filter(w => w.status === f).length})
            </button>
          ))}
          <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0.25rem' }}>|</span>
          {['all', 'automatic', 'manual'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: '0.45rem 1rem',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.8rem',
              textTransform: 'capitalize',
              background: typeFilter === t ? '#f59e0b' : 'var(--bg-tertiary)',
              color: typeFilter === t ? 'white' : 'var(--text-primary)',
              transition: 'all 0.2s'
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MoMo Details</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Received</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No withdrawals found</td>
                  </tr>
                ) : filtered.map((w, i) => {
                  const sc = STATUS_COLORS[w.status] || STATUS_COLORS.pending;
                  const displayId = `${w.type === 'automatic' ? 'AW' : 'MW'}-${w.id?.toString().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
                  return (
                    <tr key={`${w.id}-${w.type}`} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{displayId}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{w.momo_number}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{w.account_name}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>GH₵ {parseFloat(w.net_amount || w.amount).toFixed(2)}</div>
                        {parseFloat(w.charge_amount || 0) > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Requested: GH₵ {parseFloat(w.amount).toFixed(2)} (–GH₵ {parseFloat(w.charge_amount).toFixed(2)} charge)
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          background: w.type === 'automatic' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
                          color: w.type === 'automatic' ? 'var(--success)' : 'var(--primary)'
                        }}>
                          {w.type === 'automatic' ? '⚡ Auto' : '📋 Manual'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          background: sc.bg,
                          color: sc.color,
                          textTransform: 'capitalize'
                        }}>
                          {w.status}
                        </span>
                      </td>
                      {/* ✅ REASON COLUMN */}
                      <td style={{ padding: '1rem' }}>
                        {w.status === 'rejected' ? (
                          <button
                            onClick={() => setReasonModal({ show: true, text: w.rejection_reason })}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              textDecoration: 'underline'
                            }}
                          >
                            View Reason
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div>{new Date(w.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{new Date(w.created_at).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
        .loading-spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default WithdrawalHistory;