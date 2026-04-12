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
    const map = { pending: ['rgba(245,158,11,0.15)', 'var(--warning)'], approved: ['rgba(16,185,129,0.15)', 'var(--success)'], rejected: ['rgba(239,68,68,0.15)', 'var(--danger)'] };
    return map[status] || ['var(--bg-tertiary)', 'var(--text-muted)'];
  };

  if (loading) return <div className="dashboard-container"><div className="loading">Loading...</div></div>;

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/admin/manual-withdrawals" />

      <main className="main-content" style={{ paddingTop: '1rem' }}>
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
                borderRadius: '0.75rem', minWidth: '140px',
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
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Amount</th>
                  <th>MoMo Details</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No withdrawals found</td></tr>
                ) : filtered.map(w => {
                  const [bg, color] = badge(w.status);
                  return (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{w.agent_name || '—'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{w.agent_email}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>GH₵ {parseFloat(w.amount).toFixed(2)}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{w.momo_number}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{w.account_name}</div>
                      </td>
                      <td>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', background: bg, color }}>
                          {w.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {new Date(w.created_at).toLocaleDateString()}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(w.created_at).toLocaleTimeString()}</div>
                      </td>
                      <td>
                        {w.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => approve(w.id)} style={{
                              padding: '0.375rem 0.875rem', border: '1px solid rgba(16,185,129,0.4)',
                              background: 'rgba(16,185,129,0.1)', borderRadius: '0.375rem',
                              color: 'var(--success)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
                            }}>✅ Approve</button>
                            <button onClick={() => reject(w.id)} style={{
                              padding: '0.375rem 0.875rem', border: '1px solid rgba(239,68,68,0.4)',
                              background: 'rgba(239,68,68,0.1)', borderRadius: '0.375rem',
                              color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
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
    </div>
  );
};

export default ManualWithdrawals;
