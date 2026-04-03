import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AgentDashboard from './pages/agent/Dashboard';
import Withdrawals from './pages/admin/Withdrawals';
import Users from './pages/admin/Users';
import Packages from './pages/admin/Packages';
import Orders from './pages/admin/Orders';
import AgentWithdraw from './pages/agent/Withdraw';
import AgentInvite from './pages/agent/Invite';
import Store from './pages/public/Store';
import Profile from './pages/Profile';
import Statistics from './pages/agent/Statistics';
import Terms from './pages/admin/Terms';



const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/store/:slug" element={<Store />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/withdrawals" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Withdrawals />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/admin/packages" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Packages />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Orders />
            </ProtectedRoute>
          } />
          <Route path="/admin/terms" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Terms />
            </ProtectedRoute>
          } />
          
          {/* Agent Routes */}
          <Route path="/agent/dashboard" element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <AgentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/agent/withdraw" element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <AgentWithdraw />
            </ProtectedRoute>
          } />
          <Route path="/agent/invite" element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <AgentInvite />
            </ProtectedRoute>
          } />
          <Route path="/agent/statistics" element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <Statistics />
            </ProtectedRoute>
          } />
          
          {/* Profile Route (Works for Both Admin & Agent) */}
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['admin', 'agent']}>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* Default Routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={
            <div className="dashboard-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'}}>
              <div style={{textAlign: 'center'}}>
                <h1 style={{fontSize: '4rem', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>404</h1>
                <p style={{color: 'var(--text-secondary)', marginTop: '1rem'}}>Page not found</p>
                <a href="/login" className="btn-primary" style={{marginTop: '1.5rem', display: 'inline-flex'}}>
                  Go to Login
                </a>
              </div>
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;