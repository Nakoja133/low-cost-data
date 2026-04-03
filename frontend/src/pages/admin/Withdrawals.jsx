import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';

const Withdrawals = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (id) => {
    if (!window.confirm('Approve this withdrawal? Make sure you send the money first!')) {
      return;
    }

    try {
      await api.put(`/admin/withdrawals/${id}/approve`);
      alert('Withdrawal approved! Remember to send money to the agent.');
      fetchWithdrawals();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || 'Failed to approve'));
    }
  };

  const rejectWithdrawal = async (id) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      await api.put(`/admin/withdrawals/${id}/reject`, { reason });
      alert('Withdrawal rejected');
      fetchWithdrawals();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || 'Failed to reject'));
    }
  };

  const filteredWithdrawals = filter === 'all' 
    ? withdrawals 
    : withdrawals.filter(w => w.status === filter);

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'badge-warning';
      case 'success': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-muted';
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
      <nav className="navbar">
        <div>
          <h1>💰 Withdrawal Requests</h1>
          <p>Approve or reject agent withdrawals</p>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <a href="/admin/dashboard" style={{color: 'var(--primary)', textDecoration: 'none'}}>
            ← Back to Dashboard
          </a>
        </div>
      </nav>

      <main className="main-content">
        {/* Filter Buttons */}
        <div style={{marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          {['all', 'pending', 'success', 'cancelled'].map(status => (
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
              }}
            >
              {status} ({withdrawals.filter(w => w.status === status).length})
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
                  <th>Mobile Money</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                      No withdrawals found
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map(withdrawal => (
                    <tr key={withdrawal.id}>
                      <td>
                        <div style={{fontWeight: '600'}}>{withdrawal.account_name}</div>
                        <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                          {withdrawal.agent_email}
                        </div>
                      </td>
                      <td style={{fontWeight: '600'}}>
                        GH₵ {parseFloat(withdrawal.amount).toFixed(2)}
                      </td>
                      <td>
                        <div>{withdrawal.account_number}</div>
                        <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                          {withdrawal.bank_name}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                      </td>
                      <td style={{color: 'var(--text-secondary)'}}>
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {withdrawal.status === 'pending' && (
                          <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button
                              onClick={() => approveWithdrawal(withdrawal.id)}
                              className="btn-success"
                              style={{padding: '0.375rem 0.75rem', fontSize: '0.875rem'}}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectWithdrawal(withdrawal.id)}
                              className="btn-danger"
                              style={{padding: '0.375rem 0.75rem', fontSize: '0.875rem'}}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {withdrawal.status !== 'pending' && (
                          <span style={{color: 'var(--text-muted)'}}>—</span>
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