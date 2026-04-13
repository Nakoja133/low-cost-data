import { useState, useEffect } from 'react';
import { useFeedback } from '../../context/FeedbackContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const ManualWithdrawals = () => {
  const { showConfirm, showPrompt, showSuccess, showError } = useFeedback();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');

  useEffect(() => { fetchWithdrawals(); }, []);

  const fetchWithdrawals = async () => {
    try {
      const r = await api.get('/admin/manual-withdrawals');
      setWithdrawals(r.data.data || []);
    } catch { } finally { setLoading(false); }
  };

  const approve = async (id) => {
    const confirmed = await showConfirm({
      title: 'Approve Manual Withdrawal',
      message: 'Approve this request only after you have sent the money.',
      confirmText: 'Approve',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    try {
      await api.put(`/admin/manual-withdrawals/${id}/approve`);
      showSuccess('Manual withdrawal approved.');
      fetchWithdrawals();
    } catch (e) {
      showError(e.response?.data?.error || 'Failed to approve manual withdrawal.');
    }
  };

  const reject = async (id) => {
    const reason = await showPrompt({
      title: 'Reject Manual Withdrawal',
      message: 'Enter the reason for rejecting this request.',
      label: 'Rejection reason',
      placeholder: 'Type the reason for rejection',
      confirmText: 'Reject',
      cancelText: 'Cancel',
      tone: 'danger',
      multiline: true,
      validate: (value) => value.trim() ? '' : 'Enter a reason before continuing.',
    });
    if (reason === null) return;
    try {
      await api.put(`/admin/manual-withdrawals/${id}/reject`, { reason: reason.trim() });
      showSuccess('Manual withdrawal rejected.');
      fetchWithdrawals();
    } catch (e) {
      showError(e.response?.data?.error || 'Failed to reject manual withdrawal.');
    }
  };

  const STATUS = ['all', 'pending', 'approved', 'rejected'];
  const filtered = filter === 'all' ? withdrawals : withdrawals.filter(w => w.status === filter);

  const badge = (status) => {
    const map = {
      pending: ['rgba(245,158,11,0.15)', '#f59e0b'],
      approved: ['rgba(16,185,129,0.15)', '#10b981'],
      rejected: ['rgba(239,68,68,0.15)', '#ef4444']
    };
    return map[status] || ['var(--bg-tertiary)', 'var(--text-muted)'];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/admin/manual-withdrawals" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>📋 Manual Withdrawals</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Agent requests that require manual MoMo transfer
          </p>
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {STATUS.filter(s => s !== 'all').map(s => {
            const count = withdrawals.filter(w => w.status === s).length;
            const total = withdrawals.filter(w => w.status === s).reduce((sum, w) => sum + parseFloat(w.amount), 0);
            return (
              <div key={s} style={{
                padding: '1rem 1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                borderRadius: '0.75rem', minWidth: '140px', flex: 1
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize', marginBottom: '0.25rem' }}>{s}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{count}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>GH₵ {total.toFixed(2)}</div>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {STATUS.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '0.5rem 1.125rem', border: 'none', borderRadius: '2rem', cursor: 'pointer',
              fontWeight: '600', fontSize: '0.875rem', textTransform: 'capitalize',
              background: filter === s ? 'var(--primary)' : 'var(--bg-tertiary)',
              color: filter === s ? 'white' : 'var(--text-primary)',
            }}>
              {s} ({s === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === s).length})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MoMo Details</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr> <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No withdrawals found</td> </tr>
                ) : filtered.map(w => {
                  const [bg, color] = badge(w.status);
                  return (
                    <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600' }}>{w.agent_name || '—'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{w.agent_email}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>GH₵ {parseFloat(w.amount).toFixed(2)}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600' }}>{w.momo_number}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{w.account_name}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', background: bg, color: color }}>
                          {w.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {new Date(w.created_at).toLocaleDateString()}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(w.created_at).toLocaleTimeString()}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {w.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => approve(w.id)} style={{
                              padding: '0.375rem 0.875rem', border: '1px solid rgba(16,185,129,0.4)',
                              background: 'rgba(16,185,129,0.1)', borderRadius: '0.375rem',
                              color: '#10b981', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
                            }}>✅ Approve</button>
                            <button onClick={() => reject(w.id)} style={{
                              padding: '0.375rem 0.875rem', border: '1px solid rgba(239,68,68,0.4)',
                              background: 'rgba(239,68,68,0.1)', borderRadius: '0.375rem',
                              color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
                            }}>❌ Reject</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {w.processed_at ? new Date(w.processed_at).toLocaleDateString() : '—'}
                          </span>
                        )}
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
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
      `}</style>
    </div>
  );
};

export default ManualWithdrawals;