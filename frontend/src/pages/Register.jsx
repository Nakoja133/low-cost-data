import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(email.trim(), password, phone.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess('Registration successful. Redirecting to your dashboard...');
    navigate('/agent/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      position: 'relative',
    }}>
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '70px',
            height: '70px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '2rem',
          }}>
            📝
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Create Your Agent Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Register to start selling data bundles and managing your orders.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.875rem',
            marginBottom: '1.5rem',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.875rem',
            marginBottom: '1.5rem',
            color: '#16a34a',
            fontSize: '0.875rem',
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@example.com"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+233 (0)xxxxxxxxx"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating account...' : 'Register Account'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          <p style={{ margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '700' }}>
              Login here
            </Link>
          </p>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
        }}>
          <p>© 2026 Low-Cost Data Bundles</p>
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>Secure • Fast • Reliable</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
