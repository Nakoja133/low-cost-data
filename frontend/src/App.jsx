import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FeedbackProvider, useFeedback } from './context/FeedbackContext';
import api from './api/axios';

import Login   from './pages/Login';
import Store   from './pages/public/Store';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetLockPassword from './pages/ResetLockPassword';
import Register from './pages/Register';

import AdminDashboard    from './pages/admin/Dashboard';
import AdminWithdrawals  from './pages/admin/Withdrawals';
import ManualWithdrawals from './pages/admin/ManualWithdrawals';
import Users             from './pages/admin/Users';
import Packages          from './pages/admin/Packages';
import Orders            from './pages/admin/Orders';
import SuspendedAgents   from './pages/admin/SuspendedAgents';
import Terms             from './pages/admin/Terms';
import AuditLogs         from './pages/admin/AuditLogs';

import AgentDashboard      from './pages/agent/Dashboard';
import AgentWithdraw       from './pages/agent/Withdraw';
import AgentInvite         from './pages/agent/Invite';
import AgentStatistics     from './pages/agent/Statistics';
import AgentTerms          from './pages/agent/AgentTerms';
import SetPrices           from './pages/agent/SetPrices';
import WithdrawalHistory   from './pages/agent/WithdrawalHistory';
import LockActionPage      from './pages/admin/LockActionPage';

const ProtectedRoute = ({ children, allowedRoles, requireLock }) => {
  const { user, loading } = useAuth();
  const { showError } = useFeedback();
  const navigate = useNavigate();
  const [lockState, setLockState] = useState({ checking: false, locked: false, unlocked: false, error: '' });
  const [lockPassword, setLockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (!requireLock || !user) return;

    // Always check lock status on component mount - no persistence across navigations
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
      .catch(() => {
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

  if (loading) return <div className="dashboard-container"><div className="loading">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard'} replace />;
  }

    if (requireLock) {
      if (lockState.checking) {
        return <div className="dashboard-container"><div className="loading">Checking lock status...</div></div>;
      }

      if (lockState.locked && !lockState.unlocked) {
        return (
          <div className="dashboard-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ maxWidth: '420px', width: '100%', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
              <h2 style={{ margin: 0, marginBottom: '0.75rem' }}>Locked Access</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>This page is protected by your lock activities password.</p>
              <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <label htmlFor="lock-access-password" style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Lock Activities Password
                </label>
                <input
                  id="lock-access-password"
                  type="password"
                  value={lockPassword}
                  onChange={(event) => setLockPassword(event.target.value)}
                  placeholder="Enter your lock password"
                  autoComplete="new-password"
                  name="lock-access-password"
                  readOnly
                  onFocus={(event) => event.target.removeAttribute('readonly')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') unlock();
                  }}
                  style={{ width: '100%', padding: '0.9rem 1rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: `1px solid ${lockState.error ? 'rgba(239,68,68,0.45)' : 'var(--border-color)'}`, borderRadius: '0.75rem', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
              {lockState.error && (
                <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.84rem', fontWeight: '700' }}>
                  {lockState.error}
                </p>
              )}
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <button onClick={unlock} disabled={unlocking} style={{ width: '100%', padding: '0.85rem 1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: unlocking ? 'not-allowed' : 'pointer', fontWeight: '700', opacity: unlocking ? 0.75 : 1 }}>
                  {unlocking ? 'Checking Password...' : 'Unlock with Password'}
                </button>
                <button onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard')} style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Cancel and go back
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    return children;
  };

  function App() {
    return (
      <AuthProvider>
        <FeedbackProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-lock-password" element={<ResetLockPassword />} />
              <Route path="/store/:slug" element={<Store />} />

              {/* Admin */}
              <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/withdrawals" element={<ProtectedRoute allowedRoles={['admin']} requireLock><AdminWithdrawals /></ProtectedRoute>} />
              <Route path="/admin/manual-withdrawals" element={<ProtectedRoute allowedRoles={['admin']} requireLock><ManualWithdrawals /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']} requireLock><Users /></ProtectedRoute>} />
              <Route path="/admin/packages" element={<ProtectedRoute allowedRoles={['admin']} requireLock><Packages /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><Orders /></ProtectedRoute>} />
              <Route path="/admin/suspended-agents" element={<ProtectedRoute allowedRoles={['admin']} requireLock><SuspendedAgents /></ProtectedRoute>} />
              <Route path="/admin/terms" element={<ProtectedRoute allowedRoles={['admin']} requireLock><Terms /></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']} requireLock><AuditLogs /></ProtectedRoute>} />
              <Route path="/admin/lock-action/:action" element={<ProtectedRoute allowedRoles={['admin']} requireLock><LockActionPage /></ProtectedRoute>} />

              {/* Agent */}
              <Route path="/agent/dashboard" element={<ProtectedRoute allowedRoles={['agent','admin']}><AgentDashboard /></ProtectedRoute>} />
              <Route path="/agent/withdraw" element={<ProtectedRoute allowedRoles={['agent','admin']} requireLock><AgentWithdraw /></ProtectedRoute>} />
              <Route path="/agent/invite" element={<ProtectedRoute allowedRoles={['agent','admin']} requireLock><AgentInvite /></ProtectedRoute>} />
              <Route path="/agent/statistics" element={<ProtectedRoute allowedRoles={['agent','admin']}><AgentStatistics /></ProtectedRoute>} />
              <Route path="/agent/terms" element={<ProtectedRoute allowedRoles={['agent','admin']}><AgentTerms /></ProtectedRoute>} />
              <Route path="/agent/set-prices" element={<ProtectedRoute allowedRoles={['agent','admin']} requireLock><SetPrices /></ProtectedRoute>} />
              <Route path="/agent/withdrawal-history" element={<ProtectedRoute allowedRoles={['agent','admin']}><WithdrawalHistory /></ProtectedRoute>} />

              {/* Shared */}
              <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin','agent']}><Profile /></ProtectedRoute>} />

              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={
                <div className="dashboard-container" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
                  <div style={{ textAlign:'center' }}>
                    <h1 style={{ fontSize:'5rem', fontWeight:'800', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>404</h1>
                    <p style={{ color:'var(--text-secondary)', marginBottom:'1.5rem' }}>Page not found</p>
                    <a href="/login" className="btn-primary" style={{ display:'inline-flex' }}>Go to Login</a>
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
