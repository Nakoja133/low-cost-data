import { useState, useEffect } from 'react';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const Terms = () => {
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const response = await api.get('/admin/terms');
      setTerms(response.data.terms || '');
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const handleSaveTerms = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/admin/terms', { terms });
      setMessage({ type: 'success', text: 'Terms updated! All agents must re-accept.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update terms' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/admin/terms" />
      
      <main className="main-content" style={{paddingTop: '1rem'}}>
        <div className="card">
          <h2 style={{marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '700'}}>📋 Agent Terms & Rules</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
            These terms will be shown to all agents. When updated, all agents must re-accept.
          </p>

          {message.text && (
            <div style={{
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSaveTerms}>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              style={{
                width: '100%',
                minHeight: '400px',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontFamily: 'inherit',
                lineHeight: '1.8',
                resize: 'vertical',
              }}
              placeholder="Enter agent terms and rules here..."
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '1rem'}}
            >
              {loading ? 'Saving...' : '💾 Save Terms'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Terms;