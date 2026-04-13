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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/admin/terms" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>📋 Agent Terms & Rules</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
            These terms will be shown to all agents. When updated, all agents must re-accept.
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div style={{
            padding: '1rem',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>
            {message.text}
          </div>
        )}

        {/* Form Card */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <form onSubmit={handleSaveTerms}>
            <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              Terms Content
            </label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              style={{
                width: '100%',
                minHeight: '450px',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                lineHeight: '1.7',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              placeholder="Enter agent terms and rules here..."
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                marginTop: '1.25rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? 'Saving...' : '💾 Save Terms'}
            </button>
          </form>
        </div>
      </main>

      <style>{`
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
      `}</style>
    </div>
  );
};

export default Terms;