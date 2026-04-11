import { useState, useEffect } from 'react';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const STATUS_COLORS = {
  approved: { bg: 'rgba(16,185,129,0.12)', color: 'var(--success)' },
  pending:  { bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)' },
  rejected: { bg: 'rgba(239,68,68,0.12)',  color: 'var(--danger)'  },
};

const WithdrawalHistory = () => {
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all'); // all | pending | approved | rejected
  const [typeFilter, setType]   = useState('all'); // all | automatic | manual

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const r = await api.get('/agent/withdrawal-history');
      setHistory(r.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  if (loading) return <div className="dashboard-container"><div className="loading">Loading...</div></div>;

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/agent/withdrawal-history" />

      <main className="main-content" style={{ paddingTop: '1rem' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', color: 'white' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.2rem' }}>💳 Withdrawal History</h2>
          <p style={{ opacity: 0.88, fontSize: '0.875rem' }}>All your withdrawal requests</p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Requests',  value: history.length,                          color: '#8b5cf6', unit: '' },
            { label: 'Total Received',  value: totals.totalReceived.toFixed(2),          color: '#10b981', unit: 'GH₵ ' },
            { label: 'Pending',         value: totals.totalPending.toFixed(2),           color: '#f59e0b', unit: 'GH₵ ' },
            { label: 'Approved',        value: history.filter(w=>w.status==='approved').length, color: '#10b981', unit: '' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card-bg)', padding: '1.125rem', borderRadius: '0.875rem', border: '1px solid var(--border-color)', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{s.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: s.color }}>{s.unit}{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {['all','pending','approved','rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '9999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', textTransform: 'capitalize', background: filter === f ? 'var(--primary)' : 'var(--bg-tertiary)', color: filter === f ? 'white' : 'var(--text-primary)' }}>
              {f} ({f === 'all' ? history.length : history.filter(w=>w.status===f).length})
            </button>
          ))}
          <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>|</span>
          {['all','automatic','manual'].map(t => (
            <button key={t} onClick={() => setType(t)} style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '9999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', textTransform: 'capitalize', background: typeFilter === t ? '#f59e0b' : 'var(--bg-tertiary)', color: typeFilter === t ? 'white' : 'var(--text-primary)' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>MoMo Details</th>
                  <th>Amount Received</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No withdrawals found</td></tr>
                ) : filtered.map((w, i) => {
                  const sc = STATUS_COLORS[w.status] || STATUS_COLORS.pending;
                  // Generate a display ID: first 8 chars of UUID, prefixed by type
                  const displayId = `${w.type === 'automatic' ? 'AW' : 'MW'}-${w.id?.toString().replace(/-/g,'').slice(0,8).toUpperCase()}`;
                  return (
                    <tr key={`${w.id}-${w.type}`}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{displayId}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{w.momo_number}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{w.account_name}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700' }}>GH₵ {parseFloat(w.net_amount || w.amount).toFixed(2)}</div>
                        {parseFloat(w.charge_amount || 0) > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Requested: GH₵ {parseFloat(w.amount).toFixed(2)} (–GH₵ {parseFloat(w.charge_amount).toFixed(2)} charge)
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', background: w.type === 'automatic' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)', color: w.type === 'automatic' ? 'var(--success)' : 'var(--primary)' }}>
                          {w.type === 'automatic' ? '⚡ Auto' : '📋 Manual'}
                        </span>
                      </td>
                      <td>
                        <span style={{ padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                          {w.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div>{new Date(w.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(w.created_at).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WithdrawalHistory;
