import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const AgentTerms = () => {
  const [terms,   setTerms]   = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/agent/terms')
      .then(r => setTerms(r.data.terms || 'No terms found. Contact admin.'))
      .catch(() => setTerms('Unable to load terms.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/agent/terms" />

      <main className="main-content" style={{ paddingTop: '1rem' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
          borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', color: 'white',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.25rem' }}>Terms & Rules</h2>
          <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>
            Please read and abide by these rules at all times
          </p>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading">Loading terms...</div>
          ) : (
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: '1.9',
              color: 'var(--text-primary)', margin: 0,
            }}>
              {terms}
            </pre>
          )}
        </div>

        <button onClick={() => navigate(-1)} style={{
          marginTop: '0.5rem', padding: '0.75rem 1.5rem',
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
          borderRadius: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600',
        }}>← Back</button>
      </main>
    </div>
  );
};

export default AgentTerms;
