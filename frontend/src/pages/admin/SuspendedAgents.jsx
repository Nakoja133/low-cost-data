import { useState, useEffect } from 'react';
import { useFeedback } from '../../context/FeedbackContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const SuspendedAgents = () => {
  const { showConfirm, showSuccess, showError } = useFeedback();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/suspended-agents');
      setAgents(r.data.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load suspended agents' });
    } finally {
      setLoading(false);
    }
  };

  const reactivateAgent = async (agent) => {
    const confirmed = await showConfirm({
      title: 'Reactivate Agent',
      message: `Reactivate ${agent.email}?`,
      confirmText: 'Reactivate',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    try {
      await api.put(`/admin/suspended-agents/${agent.id}/reactivate`);
      showSuccess(`${agent.email} has been reactivated.`);
      setMessage({ type: '', text: '' });
      fetchAgents();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to reactivate agent';
      showError(errorMessage);
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const deleteAgent = async (agent) => {
    const confirmed = await showConfirm({
      title: 'Delete Agent',
      message: `Permanently delete ${agent.email}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/users/${agent.id}`, { data: { confirm_email: agent.email } });
      showSuccess(`${agent.email} has been deleted.`);
      setMessage({ type: '', text: '' });
      fetchAgents();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete agent';
      showError(errorMessage);
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const fmtDate = (value) => value ? new Date(value).toLocaleString() : '—';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/admin/suspended-agents" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>🚫 Suspended Agents</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.25rem 0 0' }}>
              Agents suspended for inactivity are listed here. Reactivate them when cleared.
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div style={{
            padding: '1rem',
            borderRadius: '0.75rem',
            marginBottom: '1.25rem',
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontWeight: '700'
          }}>
            {message.text}
          </div>
        )}

        {/* Content */}
        {agents.length === 0 ? (
          <div style={{
            padding: '3rem 1.5rem',
            borderRadius: '1rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>🎉 No suspended agents found</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>All your agents are active and performing well.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Agent', 'Email', 'Store', 'Phone', 'Last Order', 'Last Withdrawal', 'Suspended At', 'Orders', 'Withdrawals', 'Actions'].map((header) => (
                    <th key={header} style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{agent.username || '—'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{agent.email}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{agent.store_name || '—'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{agent.phone || '—'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{fmtDate(agent.last_order_at)}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{fmtDate(agent.last_withdrawal_at)}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{fmtDate(agent.suspended_at)}</td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{agent.total_orders}</td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{agent.total_withdrawals}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button onClick={() => reactivateAgent(agent)} style={{
                          padding: '0.5rem 0.875rem',
                          background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                          border: 'none',
                          borderRadius: '0.5rem',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: '700',
                          fontSize: '0.8rem'
                        }}>
                          ✅ Reactivate
                        </button>
                        <button onClick={() => deleteAgent(agent)} style={{
                          padding: '0.5rem 0.875rem',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: '0.5rem',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontWeight: '700',
                          fontSize: '0.8rem'
                        }}>
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <style>{`
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
        .loading-spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SuspendedAgents;