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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/agent/terms" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
          borderRadius: '1rem',
          padding: '1.75rem',
          marginBottom: '1.5rem',
          color: 'white',
          boxShadow: '0 8px 25px rgba(99,102,241,0.3)'
        }}>
          <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>📋</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.25rem', margin: 0 }}>Terms & Rules</h2>
          <p style={{ opacity: 0.9, fontSize: '0.9rem', margin: 0 }}>
            Please read and abide by these rules at all times. Violation may result in suspension.
          </p>
        </div>

        {/* Content Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
              Loading terms...
            </div>
          ) : (
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              lineHeight: '1.9',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              {terms}
            </pre>
          )}
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: '1.5rem',
            padding: '0.875rem 1.5rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.95rem',
            width: '100%',
            maxWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
        >
          ← Back to Dashboard
        </button>

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

export default AgentTerms;