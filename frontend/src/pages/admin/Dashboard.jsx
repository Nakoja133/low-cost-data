import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeAgents: 0,
    pendingWithdrawals: 0,
    adminProfit: 0,
    platformMargin: 0,
    totalPayouts: 0,
    pendingManual: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [showHolding, setShowHolding] = useState(false);
  const [holding, setHolding] = useState(null);
  const [holdingLoad, setHoldingLoad] = useState(false);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, withdrawRes, profitRes, manualRes] = await Promise.allSettled([
        api.get('/orders'),
        api.get('/admin/withdrawals'),
        api.get('/admin/profit'),
        api.get('/admin/manual-withdrawals'),
      ]);

      const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data?.data || []) : [];
      const withdraws = withdrawRes.status === 'fulfilled' ? (withdrawRes.value.data?.data || []) : [];
      const profit = profitRes.status === 'fulfilled' ? (profitRes.value.data || {}) : {};
      const manual = manualRes.status === 'fulfilled' ? (manualRes.value.data?.data || []) : [];

      setStats({
        totalSales: parseFloat(profit.totalSales || 0),
        totalOrders: orders.length,
        activeAgents: new Set(orders.map(o => o.agent_id).filter(Boolean)).size,
        pendingWithdrawals: withdraws.filter(w => w.status === 'pending').length,
        adminProfit: parseFloat(profit.adminProfit || 0),
        platformMargin: profit.platformMargin || 0,
        totalPayouts: parseFloat(profit.totalPayouts || 0),
        pendingManual: manual.filter(w => w.status === 'pending').length,
      });
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openHolding = async () => {
    setShowHolding(true);
    setHoldingLoad(true);
    try {
      const r = await api.get('/admin/check-holding');
      setHolding(r.data);
    } catch {
      setHolding(null);
    } finally {
      setHoldingLoad(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    const n = user?.username || user?.email?.split('@')[0] || 'Admin';
    if (h < 12) return `Good morning, ${n} ☀️`;
    if (h < 17) return `Good afternoon, ${n} 👋`;
    if (h < 21) return `Good evening, ${n} 🌆`;
    return `Good night, ${n} 🌙`;
  };

  // Components
  const StatCard = ({ label, value, color, sub }) => (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );

  const QuickBtn = ({ icon, label, sub, color, onClick }) => (
    <button
      className="quick-btn"
      onClick={onClick}
      style={{ '--btn-color': color }}
    >
      <span className="quick-btn-icon">{icon}</span>
      <div>
        <div className="quick-btn-label">{label}</div>
        {sub && <div className="quick-btn-sub">{sub}</div>}
      </div>
    </button>
  );

  if (loading) return (
    <div className="dashboard-container loading-screen">
      <div className="loading-spinner" />
      <span>Loading dashboard...</span>
    </div>
  );

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/admin/dashboard" />
      
      {/* Check Holding Modal */}
      {showHolding && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowHolding(false)}>
          <div className="modal-card holding-modal">
            <div className="modal-header holding-header">
              <div>
                <div className="modal-icon">🏦</div>
                <h3 className="modal-title">Check Holdings</h3>
                <p className="modal-subtitle">Current profit balances held by platform</p>
              </div>
              <button className="modal-close" onClick={() => setShowHolding(false)}>✕</button>
            </div>

            <div className="modal-body">
              {holdingLoad ? (
                <div className="loading-screen">
                  <div className="loading-spinner" />
                  <span>Calculating holdings…</span>
                </div>
              ) : holding ? (
                <>
                  <div className="holding-summary">
                    {[
                      { label: 'Admin Holding', value: `GH₵ ${parseFloat(holding.adminHolding).toFixed(2)}`, color: '#6366f1' },
                      { label: 'Agent Holdings (Total)', value: `GH₵ ${parseFloat(holding.totalAgentHolding).toFixed(2)}`, color: '#10b981' },
                      { label: 'Grand Total', value: `GH₵ ${parseFloat(holding.grandTotal).toFixed(2)}`, color: '#f59e0b' },
                    ].map(s => (
                      <div key={s.label} className="holding-card" style={{ borderTop: `3px solid ${s.color}` }}>
                        <div className="holding-card-label">{s.label}</div>
                        <div className="holding-card-value" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {holding.agents?.length > 0 && (
                    <>
                      <h4 className="section-sub-title">Agent Wallet Balances</h4>
                      <div className="agent-list">
                        {holding.agents.filter(a => parseFloat(a.wallet_balance) > 0).map(agent => (
                          <div key={agent.id} className="agent-row">
                            <div className="agent-info">
                              <div className="agent-name">{agent.username || '—'}</div>
                              <div className="agent-email">{agent.email}</div>
                            </div>
                            <span className="agent-balance">GH₵ {parseFloat(agent.wallet_balance).toFixed(2)}</span>
                          </div>
                        ))}
                        {holding.agents.every(a => parseFloat(a.wallet_balance) <= 0) && (
                          <p className="empty-state">No agent balances currently</p>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="error-state">Failed to load holdings data</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        {/* Greeting Banner */}
        <div className="greeting-banner">
          <div>
            <h2 className="greeting-title">{greeting()}</h2>
            <p className="greeting-sub">Admin Dashboard — Overview</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard label="Total Sales" value={`GH₵ ${stats.totalSales.toFixed(2)}`} color="#3b82f6" />
          <StatCard label="Platform Profit" value={`GH₵ ${stats.adminProfit.toFixed(2)}`} color="#10b981" sub={`Margin ${stats.platformMargin}% · Paid out GH₵ ${stats.totalPayouts.toFixed(2)}`} />
          <StatCard label="Total Orders" value={stats.totalOrders} color="#8b5cf6" />
          <StatCard label="Active Agents" value={stats.activeAgents} color="#f59e0b" />
          <StatCard label="Auto Withdrawals" value={stats.pendingWithdrawals} color="#ef4444" sub="pending approval" />
          <StatCard label="Manual Requests" value={stats.pendingManual} color="#f97316" sub="pending action" />
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h2 className="section-title">⚡ Quick Actions</h2>
          <div className="quick-grid">
            <QuickBtn icon="👥" label="Users" sub="Manage agents" color="#6366f1" onClick={() => navigate('/admin/users')} />
            <QuickBtn icon="📋" label="Manual Withdrawals" sub="Process MoMo requests" color="#f97316" onClick={() => navigate('/admin/manual-withdrawals')} />
            <QuickBtn icon="📦" label="Packages" sub="Data bundle prices" color="#f59e0b" onClick={() => navigate('/admin/packages')} />
            <QuickBtn icon="📊" label="Orders" sub="All transactions" color="#3b82f6" onClick={() => navigate('/admin/orders')} />
            <QuickBtn icon="🏦" label="Check Holding" sub="Platform profit balances" color="#10b981" onClick={openHolding} />
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <h2 className="section-title">🔧 System Status</h2>
          <div className="status-grid">
            {[
              { status: '✅', label: 'Backend Connected', sub: 'API running', color: '#10b981' },
              { status: '✅', label: 'Database Ready', sub: 'PostgreSQL connected', color: '#3b82f6' },
              { status: '⚠️', label: 'XRAYGH Balance', sub: 'Monitor regularly', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="status-item" style={{ background: `${s.color}12`, border: `1px solid ${s.color}30` }}>
                <div className="status-label" style={{ color: s.color }}>{s.status} {s.label}</div>
                <div className="status-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style>{`
        /* Loading */
        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem 1rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
          min-height: 60vh;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-color);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Greeting Banner */
        .greeting-banner {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 1rem;
          padding: 1.35rem 1.5rem;
          margin-bottom: 1.25rem;
          color: white;
          box-shadow: 0 8px 25px rgba(99,102,241,0.28);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          animation: fadeSlideDown 0.45s ease both;
        }
        .greeting-title {
          font-size: clamp(1.05rem, 3vw, 1.35rem);
          font-weight: 800;
          margin: 0 0 0.2rem;
          line-height: 1.3;
        }
        .greeting-sub {
          opacity: 0.88;
          font-size: 0.85rem;
          margin: 0;
        }

        /* Stat Cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.875rem;
          margin-bottom: 1.25rem;
        }
        @media (min-width: 640px) {
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(6, 1fr); }
        }
        .stat-card {
          background: var(--card-bg);
          padding: 1.1rem 1rem;
          border-radius: 0.875rem;
          border: 1px solid var(--border-color);
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: default;
          animation: fadeSlideUp 0.45s ease both;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.12);
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.35rem;
          font-weight: 500;
        }
        .stat-value {
          font-size: clamp(1.2rem, 3.5vw, 1.55rem);
          font-weight: 800;
          line-height: 1.1;
        }
        .stat-sub {
          font-size: 0.68rem;
          color: var(--text-muted, var(--text-secondary));
          margin-top: 0.25rem;
          line-height: 1.4;
        }

        /* Section Titles */
        .section-title {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 1rem;
        }

        /* Quick Action Buttons */
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        @media (min-width: 480px) {
          .quick-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 768px) {
          .quick-grid { grid-template-columns: repeat(5, 1fr); }
        }
        .quick-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.875rem;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
          color: var(--text-primary);
          width: 100%;
          min-height: 80px;
          -webkit-tap-highlight-color: transparent;
        }
        .quick-btn:hover, .quick-btn:focus-visible {
          border-color: var(--btn-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px color-mix(in srgb, var(--btn-color) 20%, transparent);
          outline: none;
        }
        .quick-btn:active {
          transform: translateY(0);
        }
        .quick-btn-icon {
          font-size: 1.35rem;
          margin-bottom: 0.4rem;
          line-height: 1;
        }
        .quick-btn-label {
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 0.15rem;
          color: var(--text-primary);
        }
        .quick-btn-sub {
          font-size: 0.7rem;
          color: var(--text-secondary);
          line-height: 1.3;
        }

        /* System Status */
        .status-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        @media (min-width: 480px) {
          .status-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .status-item {
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
        }
        .status-label {
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 0.2rem;
        }
        .status-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          z-index: 998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .modal-card {
          background: var(--card-bg);
          border-radius: 1.25rem;
          max-width: 520px;
          width: 100%;
          border: 1px solid var(--border-color);
          box-shadow: 0 25px 60px rgba(0,0,0,0.4);
          overflow: hidden;
          animation: bounceIn 0.32s cubic-bezier(0.34,1.56,0.64,1) both;
          max-height: 90dvh;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          padding: 1.25rem 1.5rem;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }
        .holding-header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        .modal-icon {
          font-size: 1.5rem;
          margin-bottom: 0.2rem;
          line-height: 1;
        }
        .modal-title {
          font-weight: 800;
          font-size: 1.05rem;
          margin: 0;
        }
        .modal-subtitle {
          opacity: 0.88;
          font-size: 0.8rem;
          margin: 0.2rem 0 0;
        }
        .modal-close {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          min-width: 34px;
          color: white;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .modal-close:hover {
          background: rgba(255,255,255,0.32);
        }
        .modal-body {
          padding: 1.25rem 1.5rem 1.5rem;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* Holding Modal Contents */
        .holding-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .holding-card {
          background: var(--bg-secondary);
          padding: 0.875rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border-color);
        }
        .holding-card-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-bottom: 0.3rem;
          font-weight: 500;
        }
        .holding-card-value {
          font-size: 1.05rem;
          font-weight: 800;
        }
        .section-sub-title {
          font-weight: 700;
          font-size: 0.875rem;
          margin: 0 0 0.75rem;
          color: var(--text-secondary);
        } 
        .agent-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .agent-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0.875rem;
          background: var(--bg-secondary);
          border-radius: 0.625rem;
          border: 1px solid var(--border-color);
          gap: 0.5rem;
        }
        .agent-info { min-width: 0; }
        .agent-name {
          font-weight: 600;
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .agent-email {
          font-size: 0.72rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .agent-balance {
          font-weight: 800;
          color: var(--success, #10b981);
          font-size: 0.95rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .empty-state {
          text-align: center;
          color: var(--text-secondary);
          padding: 1.5rem;
          font-size: 0.875rem;
        }
        .error-state {
          text-align: center;
          color: var(--danger, #ef4444);
          padding: 2rem;
          font-size: 0.875rem;
        }

        /* Animations */
        @keyframes bounceIn {
          from { opacity: 0; transform: scale(0.87); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Main content top padding */
        .main-content {
          padding-top: 1rem;
        }
        @media (max-width: 767px) {
          .main-content {
            padding-top: 0.75rem;
            padding-bottom: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;