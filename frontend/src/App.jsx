import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FeedbackProvider, useFeedback } from './context/FeedbackContext';
import api from './api/axios';

// Pages
import Login   from './pages/Login';
import Store   from './pages/public/Store';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetLockPassword from './pages/ResetLockPassword';
import Register from './pages/Register';

// Admin Pages
import AdminDashboard    from './pages/admin/Dashboard';
import AdminWithdrawals  from './pages/admin/Withdrawals';
import ManualWithdrawals from './pages/admin/ManualWithdrawals';
import Users             from './pages/admin/Users';
import Packages          from './pages/admin/Packages';
import Orders            from './pages/admin/Orders';
import SuspendedAgents   from './pages/admin/SuspendedAgents';
import Terms             from './pages/admin/Terms';
import AuditLogs         from './pages/admin/AuditLogs';
import LockActionPage    from './pages/admin/LockActionPage';

// Agent Pages
import AgentDashboard      from './pages/agent/Dashboard';
import AgentWithdraw       from './pages/agent/Withdraw';
import AgentInvite         from './pages/agent/Invite';
import AgentStatistics     from './pages/agent/Statistics';
import AgentTerms          from './pages/agent/AgentTerms';
import SetPrices           from './pages/agent/SetPrices';
import WithdrawalHistory   from './pages/agent/WithdrawalHistory';

// ── Protected Route Component ─────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles, requireLock }) => {
  const { user, loading } = useAuth();
  const { showError } = useFeedback();
  const navigate = useNavigate();
  
  const [lockState, setLockState] = useState({ checking: false, locked: false, unlocked: false, error: '' });
  const [lockPassword, setLockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Check lock status if required
  useEffect(() => {
    if (!requireLock || !user) return;
    
    // Reset state on mount
    setLockState({ checking: true, locked: false, unlocked: false, error: '' });
    setLockPassword('');

    api.get('/lock-activities/status')
      .then((r) => {
        if (r.data.is_enabled) {
          setLockState({ checking: false, locked: true, unlocked: false, error: '' });
        } else {
          setLockState({ checking: false, locked: false, unlocked: true, error: '' });
        }
      })
      .catch((err) => {
        console.error("Lock check failed", err);
        // If API fails, assume unlocked to prevent locking the user out permanently by mistake
        setLockState({ checking: false, locked: false, unlocked: true, error: '' });
      });
  }, [requireLock, user]);

  const unlock = async () => {
    if (!lockPassword.trim()) {
      showError('Enter your lock activities password to continue.');
      return;
    }
    try {
      setUnlocking(true);
      await api.post('/lock-activities/verify', { lockPassword });
      setLockPassword('');
      setLockState({ checking: false, locked: false, unlocked: true, error: '' });
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Lock password is incorrect';
      setLockState({ checking: false, locked: true, unlocked: false, error: errorMessage });
      showError(errorMessage);
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
      <div className="animate-pulse text-[var(--text-secondary)]">Loading session...</div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard'} replace />;
  }

  // Lock Logic
  if (requireLock && lockState.locked && !lockState.unlocked) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '1.5rem', 
        background: 'var(--bg-primary)' 
      }}>
        <div style={{ 
          maxWidth: '420px', 
          width: '100%', 
          background: 'var(--card-bg)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '1.25rem', 
          padding: '2rem', 
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ 
            fontSize: '3.5rem', 
            marginBottom: '1rem',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' 
          }}>
            🔒
          </div>
          <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: '800' }}>
            Locked Access
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            This page requires your Lock Activities password.
          </p>

          <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <label 
              htmlFor="lock-access-password" 
              style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}
            >
              Lock Activities Password
            </label>
            <input
              id="lock-access-password"
              type="password"
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
              placeholder="Enter your lock password"
              autoComplete="off"
              name="lock-access-password"
              onKeyDown={(e) => { if (e.key === 'Enter') unlock(); }}
              style={{ 
                width: '100%', 
                padding: '0.9rem 1rem', 
                background: 'var(--bg-secondary)', 
                color: 'var(--text-primary)', 
                border: `1px solid ${lockState.error ? 'rgba(239,68,68,0.5)' : 'var(--border-color)'}`, 
                borderRadius: '0.75rem', 
                outline: 'none', 
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {lockState.error && (
            <p style={{ 
              color: 'var(--danger)', 
              marginBottom: '1rem', 
              fontSize: '0.85rem', 
              fontWeight: '600',
              background: 'rgba(239,68,68,0.1)',
              padding: '0.5rem',
              borderRadius: '0.5rem'
            }}>
              {lockState.error}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              onClick={unlock} 
              disabled={unlocking} 
              style={{ 
                width: '100%', 
                padding: '0.85rem 1rem', 
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.75rem', 
                cursor: unlocking ? 'not-allowed' : 'pointer', 
                fontWeight: '700', 
                opacity: unlocking ? 0.7 : 1,
                fontSize: '0.95rem'
              }}
            >
              {unlocking ? 'Verifying...' : 'Unlock Page'}
            </button>
            <button 
              onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard')} 
              style={{ 
                width: '100%', 
                padding: '0.85rem 1rem', 
                background: 'transparent', 
                border: '1px solid var(--border-color)', 
                borderRadius: '0.75rem', 
                cursor: 'pointer', 
                fontWeight: '600', 
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}
            >
              Cancel and go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

// ── Main App Component ──────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Lock Reset - Must be public so users can reset without logging in fully (if logic allows) 
                OR if they are locked out and need a bypass. */}
            <Route path="/reset-lock-password" element={<ResetLockPassword />} />
            
            <Route path="/store/:slug" element={<Store />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/withdrawals" element={
              <ProtectedRoute allowedRoles={['admin']} requireLock>
                <AdminWithdrawals />
              </ProtectedRoute>
            } />
            <Route path="/admin/manual-withdrawals" element={
              <ProtectedRoute allowedRoles={['admin']} requireLock>
                <ManualWithdrawals />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']} requireLock>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="/admin/packages" element={
              <ProtectedRoute allowedRoles={['admin']} requireLock>
                <Packages />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Orders />
              </ProtectedRoute>
            } />
            <Route path="/admin/suspended-agents" element={
              <ProtectedRoute allowedRoles={['admin']} requireLock>
                <SuspendedAgents />
              </ProtectedRoute>
            } />
            <Route path="/admin/terms" element={
              <ProtectedRoute allowedRoles={['admin']} requireLock>
                <Terms />
              </ProtectedRoute>
            } />
            <Route path="/admin/audit-logs" element={
              <ProtectedRoute allowedRoles={['admin']} requireLock>
                <AuditLogs />
              </ProtectedRoute>
            } />
            <Route path="/admin/lock-action/:action" element={
              <ProtectedRoute allowedRoles={['admin']} requireLock>
                <LockActionPage />
              </ProtectedRoute>
            } />

            {/* Agent Routes */}
            <Route path="/agent/dashboard" element={
              <ProtectedRoute allowedRoles={['agent', 'admin']}>
                <AgentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/agent/withdraw" element={
              <ProtectedRoute allowedRoles={['agent', 'admin']} requireLock>
                <AgentWithdraw />
              </ProtectedRoute>
            } />
            <Route path="/agent/invite" element={
              <ProtectedRoute allowedRoles={['agent', 'admin']} requireLock>
                <AgentInvite />
              </ProtectedRoute>
            } />
            <Route path="/agent/statistics" element={
              <ProtectedRoute allowedRoles={['agent', 'admin']}>
                <AgentStatistics />
              </ProtectedRoute>
            } />
            <Route path="/agent/terms" element={
              <ProtectedRoute allowedRoles={['agent', 'admin']}>
                <AgentTerms />
              </ProtectedRoute>
            } />
            <Route path="/agent/set-prices" element={
              <ProtectedRoute allowedRoles={['agent', 'admin']} requireLock>
                <SetPrices />
              </ProtectedRoute>
            } />
            <Route path="/agent/withdrawal-history" element={
              <ProtectedRoute allowedRoles={['agent', 'admin']}>
                <WithdrawalHistory />
              </ProtectedRoute>
            } />

            {/* Shared Routes */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['admin', 'agent']}>
                <Profile />
              </ProtectedRoute>
            } />

            {/* Redirects & 404 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <h1 style={{ fontSize: '6rem', fontWeight: '800', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>404</h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Page not found</p>
                  <a href="/login" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', textDecoration: 'none', borderRadius: '0.5rem', fontWeight: '700' }}>
                    Go to Login
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </Router>
      </FeedbackProvider>
    </AuthProvider>
  );
}

export default App;