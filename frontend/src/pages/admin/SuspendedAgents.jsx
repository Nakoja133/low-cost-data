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

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/admin/suspended-agents" />
      <main className="main-content" style={{ paddingTop: '1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h2 style={{ fontSize:'1.5rem', fontWeight:'800' }}>🚫 Suspended Agents</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.95rem', margin:'0.5rem 0 0' }}>
              Agents suspended for inactivity are listed here. Reactivate them when they are cleared.
            </p>
          </div>
        </div>

        {message.text && (
          <div style={{ padding:'1rem', borderRadius:'0.75rem', marginBottom:'1.25rem', background:message.type==='success' ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)', border:`1px solid ${message.type==='success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color:message.type==='success' ? 'var(--success)' : 'var(--danger)', fontWeight:'700' }}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading suspended agents...</div>
        ) : agents.length === 0 ? (
          <div style={{ padding:'1.5rem', borderRadius:'1rem', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', color:'var(--text-secondary)' }}>
            No suspended agents found.
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'930px' }}>
              <thead>
                <tr style={{ textAlign:'left', color:'var(--text-secondary)', borderBottom:'1px solid var(--border-color)' }}>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Agent</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Email</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Store</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Phone</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Last Order</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Last Withdrawal</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Suspended At</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Orders</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Withdrawals</th>
                  <th style={{ padding:'0.9rem 0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} style={{ borderBottom:'1px solid var(--border-color)' }}>
                    <td style={{ padding:'0.9rem 0.75rem', fontWeight:'700' }}>{agent.username || '—'}</td>
                    <td style={{ padding:'0.9rem 0.75rem' }}>{agent.email}</td>
                    <td style={{ padding:'0.9rem 0.75rem' }}>{agent.store_name || '—'}</td>
                    <td style={{ padding:'0.9rem 0.75rem' }}>{agent.phone || '—'}</td>
                    <td style={{ padding:'0.9rem 0.75rem' }}>{fmtDate(agent.last_order_at)}</td>
                    <td style={{ padding:'0.9rem 0.75rem' }}>{fmtDate(agent.last_withdrawal_at)}</td>
                    <td style={{ padding:'0.9rem 0.75rem' }}>{fmtDate(agent.suspended_at)}</td>
                    <td style={{ padding:'0.9rem 0.75rem' }}>{agent.total_orders}</td>
                    <td style={{ padding:'0.9rem 0.75rem' }}>{agent.total_withdrawals}</td>
                    <td style={{ padding:'0.9rem 0.75rem', display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      <button onClick={() => reactivateAgent(agent)} style={{ padding:'0.55rem 0.9rem', background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'none', borderRadius:'0.55rem', color:'white', cursor:'pointer', fontWeight:'700' }}>
                        Reactivate
                      </button>
                      <button onClick={() => deleteAgent(agent)} style={{ padding:'0.55rem 0.9rem', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'0.55rem', color:'#b91c1c', cursor:'pointer', fontWeight:'700' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuspendedAgents;
