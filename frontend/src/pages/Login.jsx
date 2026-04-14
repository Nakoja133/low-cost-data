import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [helpCenterEmail, setHelpCenterEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setHelpCenterEmail('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard');
      } else {
        setError(result.error);
        setHelpCenterEmail(result.helpCenterEmail || '');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Background Decoration */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(ellipse at 20% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)
        `,
        zIndex: 0,
      }} />

      {/* Theme Toggle - Top Right */}
      <button 
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '0.75rem',
          padding: '0.5rem 0.75rem',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2.5rem',
          height: '2.5rem',
          transition: 'background 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Login Card */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        zIndex: 1,
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            fontSize: '1.75rem',
            boxShadow: '0 8px 20px rgba(99,102,241,0.4)',
          }}>
            📡
          </div>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '800', 
            marginBottom: '0.5rem', 
            color: 'white',
            letterSpacing: '-0.02em',
          }}>
            Welcome Back
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', margin: 0 }}>
            Login to manage your data business
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#fca5a5',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: error && helpCenterEmail ? '0.5rem' : '0' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            {helpCenterEmail && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <a href={`mailto:${helpCenterEmail}`} style={{ color: '#a5b4fc', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  📧 Contact support: {helpCenterEmail}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Email Field */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.75rem',
                background: 'rgba(15, 23, 42, 0.6)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
              }}
              placeholder="agent@example.com"
              required
              disabled={loading}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.75rem',
                background: 'rgba(15, 23, 42, 0.6)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
              required
              disabled={loading}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.95rem',
              background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.8 : 1,
              marginTop: '0.5rem',
              transition: 'transform 0.15s, opacity 0.15s',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? 'Logging in...' : 'Login to Dashboard'}
          </button>
        </form>

        {/* Footer Links */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: '600' }}>
              Register here
            </Link>
          </p>
          <Link to="/forgot-password" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-block' }}>
            Forgot password?
          </Link>
        </div>

        {/* Bottom Branding */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.8rem',
        }}>
          <p style={{ margin: 0 }}>© 2026 Low-Cost Data Bundles</p>
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>Secure • Fast • Reliable</p>
        </div>

      </div>
    </div>
  );
};

export default Login;