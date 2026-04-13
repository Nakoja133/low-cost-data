import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // 1: email request, 1.5: check email message, 2: reset form
  const [step, setStep] = useState(token ? 2 : 1); 
  
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMsg = (type, text) => {
    setMessage({ type, text });
    if (type === 'success') {
      setTimeout(() => {
        if (step === 2) {
          navigate('/login', { replace: true });
        }
      }, 2500);
    }
  };

  // Step 1: Request reset link via email
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      showMsg('success', '✅ Reset link sent. Check your email and spam folder.');
      setStep(1.5);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify token and reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg('error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showMsg('error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      showMsg('success', '✅ Password reset successfully. Redirecting to login...');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Shared Styles
  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '0.625rem',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    marginTop: '0.5rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };

  const inputFocus = (e) => {
    e.currentTarget.style.borderColor = '#6366f1';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
  };

  const inputBlur = (e) => {
    e.currentTarget.style.borderColor = 'var(--border-color)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const btnStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '0.625rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.95rem',
    marginTop: '1rem',
    transition: 'transform 0.15s, opacity 0.15s',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
  };

  const linkBtnStyle = {
    width: '100%',
    marginTop: '1rem',
    padding: '0.75rem',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '0.625rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'background 0.2s, color 0.2s',
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg-primary)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1.5rem' 
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* Header Card */}
        <div style={{ 
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
          borderRadius: '1.25rem', 
          padding: '2rem 1.5rem', 
          color: 'white', 
          textAlign: 'center', 
          marginBottom: '2rem',
          boxShadow: '0 10px 30px rgba(99,102,241,0.25)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, marginBottom: '0.25rem' }}>
            Reset Password
          </h1>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', margin: 0 }}>
            Recover access to your account
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '1rem',
            borderRadius: '0.625rem',
            marginBottom: '1.5rem',
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontWeight: '600',
            fontSize: '0.9rem',
          }}>
            {message.text}
          </div>
        )}

        {/* Form Container */}
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: '1rem', 
          padding: '2rem', 
          border: '1px solid var(--border-color)', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)' 
        }}>
          
          {step === 1 ? (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleRequestReset}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="your@email.com"
                    required
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
                <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {loading ? 'Sending...' : '📨 Send Reset Link'}
                </button>
              </form>
            </>
          ) : step === 1.5 ? (
            <>
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📧</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Check Your Email</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  The link expires in 1 hour. Check your spam folder if you don't see it.
                </p>
                <button 
                  onClick={() => { setStep(1); setEmail(''); setMessage({}); }} 
                  style={{ ...btnStyle, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                >
                  ← Send to Different Email
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Enter your new password below. Make sure it's at least 6 characters.
              </p>
              <form onSubmit={handleResetPassword}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="••••••••"
                    minLength="6"
                    required
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="••••••••"
                    required
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem' }}>⚠️ Passwords don't match</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                  style={{ ...btnStyle, opacity: (loading || newPassword !== confirmPassword || newPassword.length < 6) ? 0.6 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {loading ? 'Resetting...' : '🔐 Reset Password'}
                </button>
              </form>
            </>
          )}

          {/* Back to login */}
          <button
            onClick={() => navigate('/login')}
            style={linkBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            ← Back to Login
          </button>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Don't have an account? <a href="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '700' }}>Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;