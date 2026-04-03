import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const AgentInvite = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    store_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await api.post('/admin/users', {
        ...formData,
        role: 'agent',
      });
      
      setResult({
        success: true,
        message: response.data.message,
        link: response.data.registration_link,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.error || 'Failed to create agent',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/agent/invite" />

      <main className="main-content" style={{paddingTop: '1rem'}}>
        <div className="card">
          <h2 style={{marginBottom: '0.5rem'}}>📨 Invite New Agent</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem'}}>
            Create a new agent account under your network
          </p>
          
          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                Agent Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="input"
                placeholder="newagent@example.com"
                required
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="input"
                placeholder="Min 6 characters"
                required
                minLength="6"
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="input"
                placeholder="0240000000"
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                Store Name
              </label>
              <input
                type="text"
                value={formData.store_name}
                onChange={(e) => setFormData({...formData, store_name: e.target.value})}
                className="input"
                placeholder="Agent's Data Store"
              />
            </div>

            {result && (
              <div style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                background: result.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${result.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: result.success ? 'var(--success)' : 'var(--danger)',
              }}>
                <p style={{marginBottom: '0.5rem', fontWeight: '600'}}>{result.message}</p>
                {result.link && (
                  <div style={{marginTop: '0.75rem'}}>
                    <p style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>Registration Link:</p>
                    <div style={{
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '0.375rem',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      wordBreak: 'break-all',
                      marginBottom: '0.5rem',
                    }}>
                      {result.link}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(result.link);
                        alert('Link copied!');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                      }}
                    >
                      📋 Copy Link
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '1rem',
                marginTop: '0.5rem',
              }}
            >
              {loading ? 'Creating Agent...' : 'Create Agent Account'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AgentInvite;