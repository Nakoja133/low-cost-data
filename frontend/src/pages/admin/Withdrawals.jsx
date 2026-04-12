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
  // ✅ FIX: status values corrected — DB stores 'approved' and 'rejected', not 'success'/'cancelled'
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
    if (!confirmed) {
      return;
    }

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
      placeholder: 'Type the reason for rejection',
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

  // ✅ FIX: filter keys now match actual DB status values
  const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'];

  const filteredWithdrawals = filter === 'all'
    ? withdrawals
    : withdrawals.filter(w => w.status === filter);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':  return 'badge-warning';
      case 'approved': return 'badge-success';
      case 'rejected': return 'badge-danger';
      default:         return 'badge-muted';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/admin/withdrawals" />

      <main className="main-content" style={{ paddingTop: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>💰 Withdrawal Requests</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Approve or reject agent withdrawal requests
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <a href="/admin/dashboard" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
              ← Dashboard
            </a>
          </div>
        </div>

        {/* Summary badges */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.filter(s => s !== 'all').map(status => {
            const count = withdrawals.filter(w => w.status === status).length;
            return (
              <div key={status} style={{
                padding: '0.75rem 1.25rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
              }}>
                <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{status}: </span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Filter Buttons */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                background: filter === status ? 'var(--primary)' : 'var(--bg-tertiary)',
                color: filter === status ? 'white' : 'var(--text-primary)',
                textTransform: 'capitalize',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}
            >
              {status} ({status === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === status).length})
            </button>
          ))}
        </div>

        {/* Withdrawals Table */}
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Amount</th>
                  <th>Payment Details</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No {filter === 'all' ? '' : filter} withdrawals found
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map(withdrawal => (
                    <tr key={withdrawal.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{withdrawal.account_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {withdrawal.agent_email}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                          GH₵ {parseFloat(withdrawal.amount).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{withdrawal.account_number}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {withdrawal.bank_name}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {withdrawal.reference}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(withdrawal.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        {withdrawal.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => approveWithdrawal(withdrawal.id)}
                              style={{
                                padding: '0.375rem 0.875rem',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '0.375rem',
                                color: 'var(--success)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                              }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => rejectWithdrawal(withdrawal.id)}
                              style={{
                                padding: '0.375rem 0.875rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '0.375rem',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                              }}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                        {withdrawal.status !== 'pending' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {withdrawal.processed_at
                              ? new Date(withdrawal.processed_at).toLocaleDateString()
                              : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Withdrawals;
