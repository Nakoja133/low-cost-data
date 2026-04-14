import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FeedbackProvider, useFeedback } from './context/FeedbackContext';
import api from './api/axios';

// Pages
import Login             from './pages/Login';
import Store             from './pages/public/Store';
import Profile           from './pages/Profile';
import ForgotPassword    from './pages/ForgotPassword';
import ResetLockPassword from './pages/ResetLockPassword';
import Register          from './pages/Register';

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
import AgentDashboard    from './pages/agent/Dashboard';
import AgentWithdraw     from './pages/agent/Withdraw';
import AgentInvite       from './pages/agent/Invite';
import AgentStatistics   from './pages/agent/Statistics';
import AgentTerms        from './pages/agent/AgentTerms';
import SetPrices         from './pages/agent/SetPrices';
import WithdrawalHistory from './pages/agent/WithdrawalHistory';

// ── Lock Screen ───────────────────────────────────────────────
const LockScreen = ({ onUnlock, onCancel }) => {
  const [lockPassword, setLockPassword] = useState('');
  const [unlocking, setUnlocking]       = useState(false);
  const [error, setError]               = useState('');

  const unlock = async () => {
    if (!lockPassword.trim()) {
      setError('Enter your lock activities password to continue.');
      return;
    }
    try {
      setUnlocking(true);
      setError('');
      await api.post('/lock-activities/verify', { lockPassword });
      setLockPassword('');
      onUnlock();
    } catch (err) {
      setError(err.response?.data?.error || 'Lock password is incorrect');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="lock-screen-overlay">
      <div className="lock-screen-card">
        {/* Icon */}
        <div className="lock-screen-icon">🔒</div>

        <h2 className="lock-screen-title">Page Locked</h2>
        <p className="lock-screen-subtitle">
          Enter your Lock Activities password to access this page.
        </p>

        {/* Password input */}
        <div className="lock-screen-field">
          <label htmlFor="lock-access-pw" className="lock-screen-label">
            Lock Activities Password
          </label>
          <input
            id="lock-access-pw"
            type="password"
            value={lockPassword}
            onChange={e => { setLockPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && unlock()}
            placeholder="Enter lock password"
            autoComplete="off"
            className={`lock-screen-input${error ? ' lock-screen-input--error' : ''}`}
          />
        </div>

        {/* Error */}
        {error && <p className="lock-screen-error">{error}</p>}

        {/* Forgot password */}
        <div className="lock-screen-forgot">
          <a href="/reset-lock-password" className="lock-screen-forgot-link">
            Forgot lock password?
          </a>
        </div>

        {/* Actions */}
        <div className="lock-screen-actions">
          <button
            onClick={unlock}
            disabled={unlocking}
            className={`lock-screen-btn-primary${unlocking ? ' lock-screen-btn--loading' : ''}`}
          >
            {unlocking ? 'Verifying…' : 'Unlock Page'}
          </button>
          <button onClick={onCancel} className="lock-screen-btn-secondary">
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        .lock-screen-overlay {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          background: var(--bg-primary);
        }
        .lock-screen-card {
          max-width: 400px;
          width: 100%;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 1.25rem;
          padding: clamp(1.5rem, 5vw, 2.25rem);
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          animation: lockCardIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes lockCardIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .lock-screen-icon {
          font-size: clamp(2.5rem, 8vw, 3.5rem);
          margin-bottom: 1rem;
          filter: drop-shadow(0 4px 8px rgba(99,102,241,0.3));
          animation: lockBob 2.5s ease-in-out infinite;
        }
        @keyframes lockBob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        .lock-screen-title {
          font-size: clamp(1.25rem, 4vw, 1.5rem);
          font-weight: 800;
          margin: 0 0 0.4rem;
          color: var(--text-primary);
        }
        .lock-screen-subtitle {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0 0 1.5rem;
          line-height: 1.5;
        }
        .lock-screen-field {
          text-align: left;
          margin-bottom: 0.75rem;
        }
        .lock-screen-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.4rem;
        }
        .lock-screen-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1.5px solid var(--border-color);
          border-radius: 0.75rem;
          outline: none;
          font-size: 1rem;
          box-sizing: border-box;
          transition: border-color 0.2s;
          -webkit-appearance: none;
        }
        .lock-screen-input:focus {
          border-color: #6366f1;
        }
        .lock-screen-input--error {
          border-color: rgba(239,68,68,0.6) !important;
        }
        .lock-screen-error {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--danger, #ef4444);
          background: rgba(239,68,68,0.08);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          margin: 0 0 0.75rem;
          text-align: left;
        }
        .lock-screen-forgot {
          text-align: right;
          margin-bottom: 1.25rem;
        }
        .lock-screen-forgot-link {
          font-size: 0.8rem;
          color: #6366f1;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.15s;
        }
        .lock-screen-forgot-link:hover {
          opacity: 0.75;
          text-decoration: underline;
        }
        .lock-screen-actions {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .lock-screen-btn-primary {
          width: 100%;
          padding: 0.9rem 1rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 0.75rem;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.95rem;
          transition: opacity 0.2s, transform 0.15s;
          min-height: 48px;
          -webkit-tap-highlight-color: transparent;
        }
        .lock-screen-btn-primary:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
        }
        .lock-screen-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .lock-screen-btn--loading {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .lock-screen-btn-secondary {
          width: 100%;
          padding: 0.875rem 1rem;
          background: transparent;
          border: 1.5px solid var(--border-color);
          border-radius: 0.75rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-secondary);
          transition: border-color 0.2s, color 0.2s;
          min-height: 48px;
          -webkit-tap-highlight-color: transparent;
        }
        .lock-screen-btn-secondary:hover {
          border-color: var(--text-secondary);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

// ── Protected Route ───────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles, requireLock }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [lockState, setLockState] = useState({ checking: false, locked: false, unlocked: false });

  useEffect(() => {
    if (!requireLock || !user) return;
    setLockState({ checking: true, locked: false, unlocked: false });

    api.get('/lock-activities/status')
      .then(r => {
        setLockState({
          checking: false,
          locked:   r.data.is_enabled,
          unlocked: !r.data.is_enabled,
        });
      })
      .catch(() => {
        // Fail open — never lock user out due to a network error
        setLockState({ checking: false, locked: false, unlocked: true });
      });
  }, [requireLock, user]);

  if (loading || lockState.checking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh', background:'var(--bg-primary)', flexDirection:'column', gap:'0.75rem' }}>
      <div style={{ width:'28px', height:'28px', border:'3px solid var(--border-color)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <span style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>Loading…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard'} replace />;
  }

  if (requireLock && lockState.locked && !lockState.unlocked) {
    return (
      <LockScreen
        onUnlock={() => setLockState({ checking: false, locked: false, unlocked: true })}
        onCancel={() => navigate(user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard')}
      />
    );
  }

  return children;
};

// ── App ───────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/login"               element={<Login />} />
            <Route path="/register"            element={<Register />} />
            <Route path="/forgot-password"     element={<ForgotPassword />} />
            <Route path="/reset-lock-password" element={<ResetLockPassword />} />
            <Route path="/store/:slug"         element={<Store />} />

            {/* Admin */}
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

            {/* Agent */}
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

            {/* Shared */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['admin', 'agent']}>
                <Profile />
              </ProtectedRoute>
            } />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </FeedbackProvider>
    </AuthProvider>
  );
}

// ── 404 Page ──────────────────────────────────────────────────
const NotFound = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh', background:'var(--bg-primary)', padding:'1.5rem' }}>
    <div style={{ textAlign:'center' }}>
      <h1 style={{ fontSize:'clamp(4rem,15vw,7rem)', fontWeight:'800', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:'0 0 0.5rem', lineHeight:1 }}>
        404
      </h1>
      <p style={{ color:'var(--text-secondary)', marginBottom:'2rem', fontSize:'clamp(1rem,3vw,1.2rem)' }}>
        Page not found
      </p>
      <a href="/login" style={{ display:'inline-block', padding:'0.875rem 2rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', textDecoration:'none', borderRadius:'0.75rem', fontWeight:'700', fontSize:'0.95rem' }}>
        Go to Login
      </a>
    </div>
  </div>
);

export default App;
