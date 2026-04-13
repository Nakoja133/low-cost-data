import { useState, useEffect } from 'react';
import { useNavigate }          from 'react-router-dom';
import { useAuth }              from '../../context/AuthContext';
import { useTheme }             from '../../context/ThemeContext';
import api                      from '../../api/axios';
import MobileMenu               from '../../components/MobileMenu';

const AdminDashboard = () => {
  const { user }               = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate               = useNavigate();

  const [stats,       setStats]       = useState({ totalSales:0, totalOrders:0, activeAgents:0, pendingWithdrawals:0, adminProfit:0, platformMargin:0, totalPayouts:0, pendingManual:0 });
  const [loading,     setLoading]     = useState(true);
  const [showHolding, setShowHolding] = useState(false);
  const [holding,     setHolding]     = useState(null);
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
      const orders    = ordersRes.status    === 'fulfilled' ? (ordersRes.value.data?.data    || []) : [];
      const withdraws = withdrawRes.status  === 'fulfilled' ? (withdrawRes.value.data?.data  || []) : [];
      const profit    = profitRes.status    === 'fulfilled' ? (profitRes.value.data          || {}) : {};
      const manual    = manualRes.status    === 'fulfilled' ? (manualRes.value.data?.data    || []) : [];
      setStats({
        totalSales:         parseFloat(profit.totalSales  || 0),
        totalOrders:        orders.length,
        activeAgents:       new Set(orders.map(o => o.agent_id).filter(Boolean)).size,
        pendingWithdrawals: withdraws.filter(w => w.status === 'pending').length,
        adminProfit:        parseFloat(profit.adminProfit || 0),
        platformMargin:     profit.platformMargin || 0,
        totalPayouts:       parseFloat(profit.totalPayouts || 0),
        pendingManual:      manual.filter(w => w.status === 'pending').length,
      });
    } catch (err) { console.error('Dashboard error:', err); }
    finally { setLoading(false); }
  };

  const openHolding = async () => {
    setShowHolding(true);
    setHoldingLoad(true);
    try {
      const r = await api.get('/admin/check-holding');
      setHolding(r.data);
    } catch { setHolding(null); }
    finally { setHoldingLoad(false); }
  };

  const greeting = () => {
    const h = new Date().getHours();
    const n = user?.username || user?.email?.split('@')[0] || 'Admin';
    if (h < 12) return `Good morning, ${n} ☀️`;
    if (h < 17) return `Good afternoon, ${n} 👋`;
    if (h < 21) return `Good evening, ${n} 🌆`;
    return `Good night, ${n} 🌙`;
  };

  // ✅ FIXED: Organized layout - Label top, Value bottom-left, Sub bottom-right
  const StatCard = ({ label, value, color, sub }) => (
    <div style={{ background:'var(--card-bg)', padding:'1.25rem', borderRadius:'1rem', border:'1px solid var(--border-color)', borderLeft:`4px solid ${color}`, display:'flex', flexDirection:'column', minHeight:'120px', justifyContent:'space-between' }}>
      <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'0.75rem', fontWeight:'600' }}>{label}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'auto' }}>
        <div style={{ fontSize:'1.65rem', fontWeight:'800', color }}>{value}</div>
        {sub && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textAlign:'right', marginLeft:'0.5rem', lineHeight:'1.3' }}>{sub}</div>}
      </div>
    </div>
  );

  const QuickBtn = ({ icon, label, sub, color, onClick }) => (
    <button onClick={onClick}
      style={{ padding:'1.125rem 1rem', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'0.875rem', cursor:'pointer', textAlign:'left', transition:'all 0.2s', color:'var(--text-primary)', width:'100%' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=color; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 4px 16px ${color}30`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
    >
      <div style={{ fontSize:'1.4rem', marginBottom:'0.4rem' }}>{icon}</div>
      <div style={{ fontWeight:'700', fontSize:'0.88rem', marginBottom:'0.15rem' }}>{label}</div>
      <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>{sub}</div>
    </button>
  );

  if (loading) return <div className="dashboard-container"><div className="loading">Loading dashboard...</div></div>;

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/admin/dashboard" />

      {/* ── Check Holding Modal ─────────────────────────────── */}
      {showHolding && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:998, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'var(--card-bg)', borderRadius:'1.25rem', maxWidth:'520px', width:'100%', border:'1px solid var(--border-color)', boxShadow:'0 25px 60px rgba(0,0,0,0.4)', overflow:'hidden', animation:'bounceIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', padding:'1.25rem 1.5rem', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:'1.5rem', marginBottom:'0.15rem' }}>🏦</div>
                <h3 style={{ fontWeight:'800', fontSize:'1.1rem', margin:0 }}>Check Holdings</h3>
                <p style={{ opacity:0.88, fontSize:'0.8rem', margin:'0.2rem 0 0' }}>Current profit balances held by platform</p>
              </div>
              <button onClick={() => setShowHolding(false)} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:'32px', height:'32px', color:'white', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ padding:'1.5rem', maxHeight:'60vh', overflowY:'auto' }}>
              {holdingLoad ? (
                <div className="loading">Calculating holdings...</div>
              ) : holding ? (
                <>
                  {/* Summary */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.875rem', marginBottom:'1.5rem' }}>
                    {[
                      { label:'Admin Holding',        value:`GH₵ ${parseFloat(holding.adminHolding).toFixed(2)}`,        color:'#6366f1' },
                      { label:'Agent Holdings (Total)',value:`GH₵ ${parseFloat(holding.totalAgentHolding).toFixed(2)}`,   color:'#10b981' },
                      { label:'Grand Total',           value:`GH₵ ${parseFloat(holding.grandTotal).toFixed(2)}`,          color:'#f59e0b' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'var(--bg-secondary)', padding:'1rem', borderRadius:'0.875rem', border:'1px solid var(--border-color)', borderTop:`3px solid ${s.color}` }}>
                        <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)', marginBottom:'0.3rem' }}>{s.label}</div>
                        <div style={{ fontSize:'1.1rem', fontWeight:'800', color:s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Per-agent breakdown */}
                  {holding.agents?.length > 0 && (
                    <>
                      <h4 style={{ fontWeight:'700', fontSize:'0.9rem', marginBottom:'0.875rem', color:'var(--text-secondary)' }}>Agent Wallet Balances</h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
                        {holding.agents.filter(a => parseFloat(a.wallet_balance) > 0).map(agent => (
                          <div key={agent.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.875rem', background:'var(--bg-secondary)', borderRadius:'0.625rem', border:'1px solid var(--border-color)' }}>
                            <div>
                              <div style={{ fontWeight:'600', fontSize:'0.9rem' }}>{agent.username || '—'}</div>
                              <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{agent.email}</div>
                            </div>
                            <span style={{ fontWeight:'800', color:'var(--success)', fontSize:'1rem' }}>
                              GH₵ {parseFloat(agent.wallet_balance).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {holding.agents.every(a => parseFloat(a.wallet_balance) <= 0) && (
                          <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'1.5rem' }}>No agent balances currently</p>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p style={{ textAlign:'center', color:'var(--danger)', padding:'2rem' }}>Failed to load holdings data</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="main-content" style={{ paddingTop:'1rem' }}>

        {/* Greeting */}
        <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:'1rem', padding:'1.5rem', marginBottom:'1.25rem', color:'white', boxShadow:'0 8px 25px rgba(99,102,241,0.3)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h2 style={{ fontSize:'1.35rem', fontWeight:'800', marginBottom:'0.2rem' }}>{greeting()}</h2>
            <p style={{ opacity:0.88, fontSize:'0.875rem' }}>Admin Dashboard — Overview</p>
          </div>
        </div>

        {/* Stats - Organized Layout */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'1rem', marginBottom:'1.25rem' }}>
          <StatCard label="Total Sales"      value={`GH₵ ${stats.totalSales.toFixed(2)}`}   color="#3b82f6" />
          <StatCard label="Platform Profit"  value={`GH₵ ${stats.adminProfit.toFixed(2)}`}  color="#10b981" sub={`Margin ${stats.platformMargin}% | Paid out GH₵ ${stats.totalPayouts.toFixed(2)}`} />
          <StatCard label="Total Orders"     value={stats.totalOrders}                        color="#8b5cf6" />
          <StatCard label="Active Agents"    value={stats.activeAgents}                       color="#f59e0b" />
          <StatCard label="Auto Withdrawals" value={stats.pendingWithdrawals}                 color="#ef4444" sub="pending approval" />
          <StatCard label="Manual Requests"  value={stats.pendingManual}                      color="#f97316" sub="pending action" />
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <h2 style={{ fontSize:'1rem', fontWeight:'700', marginBottom:'1rem' }}>⚡ Quick Actions</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'0.75rem' }}>
            <QuickBtn icon="👥" label="Users"              sub="Manage agents"         color="#6366f1" onClick={() => navigate('/admin/users')} />
            <QuickBtn icon="📋" label="Manual Withdrawals" sub="Process MoMo requests" color="#f97316" onClick={() => navigate('/admin/manual-withdrawals')} />
            <QuickBtn icon="📦" label="Packages"           sub="Data bundle prices"    color="#f59e0b" onClick={() => navigate('/admin/packages')} />
            <QuickBtn icon="📊" label="Orders"             sub="All transactions"      color="#3b82f6" onClick={() => navigate('/admin/orders')} />
            <QuickBtn icon="🏦" label="Check Holding"      sub="Platform profit balances" color="#10b981" onClick={openHolding} />
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <h2 style={{ fontSize:'1rem', fontWeight:'700', marginBottom:'1rem' }}>🔧 System Status</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.875rem' }}>
            {[
              { status:'✅', label:'Backend Connected', sub:'API running',          color:'#10b981' },
              { status:'✅', label:'Database Ready',    sub:'PostgreSQL connected', color:'#3b82f6' },
              { status:'⚠️', label:'XRAYGH Balance',   sub:'Monitor regularly',    color:'#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ padding:'0.875rem', background:`${s.color}12`, borderRadius:'0.75rem', border:`1px solid ${s.color}30` }}>
                <div style={{ fontWeight:'700', fontSize:'0.875rem', color:s.color, marginBottom:'0.2rem' }}>{s.status} {s.label}</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style>{`@keyframes bounceIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
};

export default AdminDashboard;