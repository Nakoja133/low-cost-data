import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const Withdrawals = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showConfirm, showPrompt, showSuccess, showError } = useFeedback();
  
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const response = await api.get('/admin/withdrawals');
      setWithdrawals(response.data.data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      showError('Failed to load withdrawals.');
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (id) => {
    const confirmed = await showConfirm({
      title: 'Approve Withdrawal',
      message: 'Approve this withdrawal only after you have sent the money to the agent.',
      confirmText: 'Approve',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.put(`/admin/withdrawals/${id}/approve`);
      showSuccess('Withdrawal approved. Debit recorded in agent wallet.');
      fetchWithdrawals();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to approve withdrawal.');
    }
  };

  const rejectWithdrawal = async (id) => {
    const reason = await showPrompt({
      title: 'Reject Withdrawal',
      message: 'Enter the reason for rejecting this withdrawal.',
      label: 'Rejection reason',
      placeholder: 'e.g. Invalid account details',
      confirmText: 'Reject',
      cancelText: 'Cancel',
      tone: 'danger',
      multiline: true,
      validate: (value) => value.trim() ? '' : 'Enter a reason before continuing.',
    });

    if (reason === null) return;

    try {
      await api.put(`/admin/withdrawals/${id}/reject`, { reason: reason.trim() });
      showSuccess('Withdrawal rejected. Agent has been notified.');
      fetchWithdrawals();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to reject withdrawal.');
    }
  };

  const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'];

  const filteredWithdrawals = filter === 'all'
    ? withdrawals
    : withdrawals.filter(w => w.status === filter);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':  return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', text: 'Pending' };
      case 'approved': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', text: 'Approved' };
      case 'rejected': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', text: 'Rejected' };
      default:         return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', text: 'Unknown' };
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/admin/withdrawals" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>💰 Withdrawal Requests</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Approve or reject agent withdrawal requests
            </p>
          </div>
          <button onClick={() => window.history.back()}
            style={{ padding: '0.6rem 1.2rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
            ← Back
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.filter(s => s !== 'all').map(status => {
            const count = withdrawals.filter(w => w.status === status).length;
            const colors = getStatusBadge(status);
            return (
              <div key={status} style={{
                flex: 1,
                minWidth: '120px',
                padding: '1rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: colors.color }}>{count}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: '600' }}>{status}</div>
              </div>
            );
          })}
        </div>

        {/* Filter Buttons */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {STATUS_FILTERS.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                background: filter === status ? 'var(--primary)' : 'var(--bg-secondary)',
                color: filter === status ? 'white' : 'var(--text-secondary)',
                textTransform: 'capitalize',
                fontWeight: '600',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {status} ({status === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === status).length})
            </button>
          ))}
        </div>

        {/* Withdrawals Table */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Details</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No withdrawals found.
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map(withdrawal => {
                    const statusStyle = getStatusBadge(withdrawal.status);
                    return (
                      <tr key={withdrawal.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{withdrawal.account_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{withdrawal.agent_email}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                            GH₵ {parseFloat(withdrawal.amount).toFixed(2)}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{withdrawal.account_number}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{withdrawal.bank_name}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>
                            {withdrawal.reference}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            textTransform: 'capitalize'
                          }}>
                            {statusStyle.text}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(withdrawal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          {withdrawal.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => approveWithdrawal(withdrawal.id)}
                                style={{
                                  padding: '0.5rem 0.875rem',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  borderRadius: '0.375rem',
                                  color: '#10b981',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                                }}
                              >
                                ✅ Approve
                              </button>
                              <button
                                onClick={() => rejectWithdrawal(withdrawal.id)}
                                style={{
                                  padding: '0.5rem 0.875rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  borderRadius: '0.375rem',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                                }}
                              >
                                ❌ Reject
                              </button>
                            </div>
                          )}
                          {withdrawal.status !== 'pending' && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleDateString() : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style>{`
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-color);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
      `}</style>
    </div>
  );
};

export default Withdrawals;