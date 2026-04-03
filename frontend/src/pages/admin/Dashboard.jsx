import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [stats, setStats] = useState({
    totalSales: 0, totalOrders: 0, activeAgents: 0, pendingWithdrawals: 0,
    adminProfit: 0, platformMargin: 0, totalPayouts: 0, xrayCosts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('📊 Fetching admin dashboard stats...');
      
      const ordersRes = await api.get('/orders');
      const orders = ordersRes.data?.data || ordersRes.data || [];
      const totalSales = orders.reduce((sum, order) => sum + (parseFloat(order.amount_paid) || 0), 0);
      const agentIds = new Set(orders.map(o => o.agent_id).filter(Boolean));

      const withdrawalsRes = await api.get('/admin/withdrawals');
      const withdrawals = withdrawalsRes.data?.data || withdrawalsRes.data || [];
      const pending = withdrawals.filter(w => w.status === 'pending').length;

      const profitRes = await api.get('/admin/profit');
      const profitData = profitRes.data || {};

      setStats({
        totalSales,
        totalOrders: orders.length,
        activeAgents: agentIds.size,
        pendingWithdrawals: pending,
        adminProfit: profitData.adminProfit || 0,
        platformMargin: profitData.platformMargin || 0,
        totalPayouts: profitData.totalPayouts || 0,
        xrayCosts: profitData.xrayCosts || 0,
      });
    } catch (error) {
      console.error('❌ Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeBasedGreeting = (name) => {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17 && hour < 21) greeting = 'Good evening';
    else greeting = 'Good night';
    return `${greeting}, ${name}! 👋`;
  };

  if (loading) {
    return <div className="dashboard-container"><div className="loading">Loading dashboard...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/admin/dashboard" />

      <main className="main-content" style={{paddingTop: '1rem'}}>
        {/* Greeting Card */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          color: 'white',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)',
        }}>
          <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem'}}>
            {getTimeBasedGreeting(user?.username || user?.email?.split('@')[0] || 'Admin')}
          </h2>
          <p style={{opacity: 0.9, fontSize: '0.9rem'}}>Welcome back to Admin Dashboard</p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #3b82f6'}}>
            <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Total Sales</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#3b82f6'}}>GH₵ {stats.totalSales.toFixed(2)}</div>
          </div>

          <div style={{background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #10b981'}}>
            <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Your Platform Profit</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#10b981'}}>GH₵ {stats.adminProfit.toFixed(2)}</div>
            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Margin: {stats.platformMargin}% | Payouts: GH₵ {stats.totalPayouts.toFixed(2)}</div>
          </div>

          <div style={{background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #8b5cf6'}}>
            <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Active Agents</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#8b5cf6'}}>{stats.activeAgents}</div>
          </div>

          <div style={{background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #f59e0b'}}>
            <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Pending Withdrawals</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#f59e0b'}}>{stats.pendingWithdrawals}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 style={{fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.25rem'}}>⚡ Quick Actions</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem'}}>
            <a href="/admin/users" style={{textDecoration: 'none'}}>
              <button style={{width: '100%', padding: '1.25rem', background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05))', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '0.75rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left'}}>
                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>👥</div>
                <div style={{fontWeight: '600', marginBottom: '0.25rem'}}>Manage Users</div>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Create admins & agents</div>
              </button>
            </a>
            <a href="/admin/withdrawals" style={{textDecoration: 'none'}}>
              <button style={{width: '100%', padding: '1.25rem', background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '0.75rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left'}}>
                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>💰</div>
                <div style={{fontWeight: '600', marginBottom: '0.25rem'}}>Withdrawals</div>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Approve pending requests</div>
              </button>
            </a>
            <a href="/admin/packages" style={{textDecoration: 'none'}}>
              <button style={{width: '100%', padding: '1.25rem', background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '0.75rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left'}}>
                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>📦</div>
                <div style={{fontWeight: '600', marginBottom: '0.25rem'}}>Packages</div>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Manage data bundles</div>
              </button>
            </a>
            <a href="/admin/orders" style={{textDecoration: 'none'}}>
              <button style={{width: '100%', padding: '1.25rem', background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.75rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left'}}>
                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>📊</div>
                <div style={{fontWeight: '600', marginBottom: '0.25rem'}}>Orders</div>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>View all transactions</div>
              </button>
            </a>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <h2 style={{fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.25rem'}}>🔧 System Status</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
            <div style={{padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.3)'}}>
              <div style={{color: 'var(--success)', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.9rem'}}>✅ Backend Connected</div>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>API: localhost:3000</div>
            </div>
            <div style={{padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.3)'}}>
              <div style={{color: 'var(--info)', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.9rem'}}>✅ Database Ready</div>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>PostgreSQL: low_cost_data_db</div>
            </div>
            <div style={{padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.3)'}}>
              <div style={{color: 'var(--warning)', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.9rem'}}>⚠️ XRAYGH Balance</div>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Check dashboard regularly</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;