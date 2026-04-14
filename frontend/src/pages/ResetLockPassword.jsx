import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const ResetLockPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Step 1: Email Request, 1.5: Success/Check Email, 2: Reset Form
  const [step, setStep] = useState(token ? 2 : 1);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMsg = (type, text) => {
    setMessage({ type, text });
    if (type === 'success' && step === 2) {
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    }
  };

  // Step 1: Request reset link via email
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/lock-activities/forgot-password', { email });
      showMsg('success', '✅ Reset link sent to your email. Check spam if not received.');
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
    if (newPassword.length < 4) {
      showMsg('error', 'Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/lock-activities/reset-password', { token, newPassword });
      showMsg('success', '✅ Lock password reset successfully. Redirecting to login...');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────
  const containerStyle = {
    minHeight: '100vh',
    background: 'var(--bg-primary, #0f172a)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const cardWrapperStyle = {
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  };

  // Orange Header Card
  const headerCardStyle = {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    borderRadius: '1.5rem',
    padding: '2.5rem 1.5rem',
    color: 'white',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(245, 158, 11, 0.25)',
  };

  const lockIconStyle = {
    fontSize: '3.5rem',
    marginBottom: '1rem',
    display: 'block',
    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
  };

  const headerTitleStyle = {
    fontSize: '1.75rem',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-0.02em',
  };

  const headerSubtitleStyle = {
    opacity: 0.9,
    fontSize: '0.95rem',
    margin: '0.5rem 0 0 0',
    fontWeight: '500',
  };

  // Form Card
  const formCardStyle = {
    background: 'var(--card-bg, #1e293b)',
    borderRadius: '1.25rem',
    padding: '2rem',
    border: '1px solid var(--border-color, #334155)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '1px solid var(--border-color, #475569)',
    borderRadius: '0.75rem',
    background: 'var(--bg-secondary, #0f172a)',
    color: 'var(--text-primary, #f8fafc)',
    fontSize: '1rem',
    marginTop: '0.5rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: '600',
    fontSize: '0.85rem',
    marginBottom: '0.25rem',
    color: 'var(--text-secondary, #94a3b8)',
  };

  const btnStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.95rem',
    marginTop: '1.25rem',
    transition: 'opacity 0.2s, transform 0.1s',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  };

  const linkBtnStyle = {
    width: '100%',
    marginTop: '1rem',
    padding: '0.75rem',
    background: 'transparent',
    border: '1px solid var(--border-color, #334155)',
    borderRadius: '0.75rem',
    color: 'var(--text-secondary, #94a3b8)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'background 0.2s, color 0.2s',
  };

  return (
    <div style={containerStyle}>
      <div style={cardWrapperStyle}>
        
        {/* 1. Header Card (Always visible) */}
        <div style={headerCardStyle}>
          <span style={lockIconStyle}>🔐</span>
          <h1 style={headerTitleStyle}>Reset Lock Password</h1>
          <p style={headerSubtitleStyle}>Recover your Lock Activities access</p>
        </div>

        {/* 2. Message Alert */}
        {message.text && (
          <div style={{
            padding: '1rem',
            borderRadius: '0.75rem',
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: message.type === 'success' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
            fontWeight: '600',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}>
            {message.text}
          </div>
        )}

        {/* 3. Form Card */}
        <div style={formCardStyle}>
          
          {/* Step 1: Enter Email */}
          {step === 1 && (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Enter your email address and we'll send you a link to reset your lock activities password.
              </p>
              <form onSubmit={handleRequestReset}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Sending...' : '📨 Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {/* Step 1.5: Success / Check Email */}
          {step === 1.5 && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Check Your Email
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                We've sent a reset link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
              </p>
              {/* ✅ UPDATED TEXT: 15 minutes */}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
                The link expires in 15 minutes. Check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => { setStep(1); setEmail(''); setMessage({}); }}
                style={linkBtnStyle}
              >
                ← Send to Different Email
              </button>
            </div>
          )}

          {/* Step 2: Reset Form (Token Present) */}
          {step === 2 && (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Enter your new lock activities password below. It must be at least 4 characters long.
              </p>
              <form onSubmit={handleResetPassword}>
                <div>
                  <label style={labelStyle}>New Lock Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="••••••••"
                    minLength="4"
                    required
                  />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="••••••••"
                    required
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ⚠️ Passwords don't match
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || newPassword !== confirmPassword || newPassword.length < 4}
                  style={{ 
                    ...btnStyle, 
                    opacity: (loading || newPassword !== confirmPassword || newPassword.length < 4) ? 0.6 : 1 
                  }}
                >
                  {loading ? 'Resetting...' : '🔐 Reset Lock Password'}
                </button>
              </form>
            </>
          )}

          {/* Back to Login Link */}
          <button
            onClick={() => navigate('/login')}
            style={linkBtnStyle}
          >
            ← Back to Login
          </button>

        </div>
      </div>
    </div>
  );
};

export default ResetLockPassword;