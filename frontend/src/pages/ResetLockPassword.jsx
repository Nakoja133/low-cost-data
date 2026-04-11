import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const ResetLockPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState(token ? 2 : 1); // 1: email request, 2: reset form
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMsg = (type, text) => {
    setMessage({ type, text });
    if (type === 'success') {
      setTimeout(() => {
        if (type === 'success' && step === 2) {
          navigate('/login', { replace: true });
        }
      }, 2000);
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

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '0.625rem',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    marginTop: '0.5rem',
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
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Header Card */}
        <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: '1.25rem', padding: '2rem 1.5rem', color: 'white', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, marginBottom: '0.25rem' }}>Reset Lock Password</h1>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', margin: 0 }}>Recover your Lock Activities access</p>
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
        <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          
          {step === 1 ? (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Enter your email address and we'll send you a link to reset your lock activities password.
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
                  />
                </div>
                <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Sending...' : '📨 Send Reset Link'}
                </button>
              </form>
            </>
          ) : step === 1.5 ? (
            <>
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📧</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Check Your Email</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  We've sent a reset link to <strong>{email}</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  The link expires in 1 hour. Check your spam folder if you don't see it.
                </p>
                <button onClick={() => { setStep(1); setEmail(''); setMessage({}); }} style={{ ...btnStyle, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  ← Send to Different Email
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Enter your new lock activities password. Make sure it's at least 4 characters and different from your account password.
              </p>
              <form onSubmit={handleResetPassword}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    New Lock Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="••••"
                    minLength="4"
                    required
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
                    placeholder="••••"
                    required
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>⚠️ Passwords don't match</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || newPassword !== confirmPassword || newPassword.length < 4}
                  style={{ ...btnStyle, opacity: (newPassword !== confirmPassword || newPassword.length < 4) ? 0.6 : 1 }}
                >
                  {loading ? 'Resetting...' : '🔐 Reset Lock Password'}
                </button>
              </form>
            </>
          )}

          {/* Back to login */}
          <button
            onClick={() => navigate('/login')}
            style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.625rem', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetLockPassword;
