import { useState, useEffect } from 'react';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const RANGE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  // ✅ Read saved range from localStorage so dashboard stays in sync
  const [timeRange, setTimeRange] = useState(() => localStorage.getItem('agent_stats_range') || 'weekly');
  const [stats, setStats] = useState({
    totalOrders: 0, totalRevenue: 0, totalProfit: 0,
    uniqueCustomers: 0, orders: [], networkDistribution: [], recentOrders: [],
  });

  useEffect(() => { fetchStatistics(); }, [timeRange]);

  const handleRangeChange = (val) => {
    setTimeRange(val);
    // ✅ Persist so Dashboard.jsx can read it and show matching labels
    localStorage.setItem('agent_stats_range', val);
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const r = await api.get('/agent/statistics', { params: { range: timeRange } });
      setStats(r.data);
    } catch (err) { 
      console.error('Stats error:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  // ── Bar chart ─────────────────────────────────────────────────
  const BarChart = ({ data }) => {
    if (!data || data.length === 0) return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        No data for this period
      </div>
    );
    const max = Math.max(...data.map(d => d.value), 1);
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '130px', paddingBottom: '20px', position: 'relative' }}>
        {data.map((item, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div title={`${item.label}: ${item.value}`}
              style={{ 
                width: '100%', 
                background: 'linear-gradient(180deg,var(--primary),#4f46e5)', 
                borderRadius: '4px 4px 0 0', 
                height: `${Math.max((item.value / max) * 100, 3)}%`, 
                minHeight: '4px', 
                transition: 'height 0.5s ease', 
                cursor: 'default' 
              }}
            />
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '4px', transform: 'rotate(-40deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '30px' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Network distribution ──────────────────────────────────────
  const NetworkBars = ({ data }) => {
    if (!data || data.length === 0) return <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No data</div>;
    const total = data.reduce((s, d) => s + d.value, 0);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: '600' }}>{item.label}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{item.value} ({pct}%)</span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${total > 0 ? (item.value / total) * 100 : 0}%`, 
                  height: '100%', 
                  background: colors[i % colors.length], 
                  borderRadius: '4px', 
                  transition: 'width 0.5s ease' 
                }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const statusColor = (s) => s === 'completed' ? '#10b981' : s === 'pending' ? '#f59e0b' : '#ef4444';
  const label = RANGE_LABELS[timeRange];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/agent/statistics" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800' }}>📈 Statistics</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>Your sales performance</p>
          </div>
          <select 
            value={timeRange} 
            onChange={e => handleRangeChange(e.target.value)} 
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <div className="loading-spinner" />
          </div>
        ) : (
          <>
            {/* Summary cards — labeled with selected range */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
              {[
                { label: `Orders (${label})`, value: stats.totalOrders, unit: '', color: 'var(--primary)' },
                { label: `Revenue (${label})`, value: parseFloat(stats.totalRevenue || 0).toFixed(2), unit: 'GH₵ ', color: '#3b82f6' },
                { label: `Profit (${label})`, value: parseFloat(stats.totalProfit || 0).toFixed(2), unit: 'GH₵ ', color: '#10b981' },
                { label: 'Unique Customers', value: stats.uniqueCustomers || 0, unit: '', color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--card-bg)', padding: '1.125rem', borderRadius: '0.875rem', border: '1px solid var(--border-color)', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>{s.label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: s.color }}>{s.unit}{s.value}</div>
                </div>
              ))}
            </div>

            {/* Order trend chart */}
            <div className="card" style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.25rem', margin: 0 }}>📊 Order Trend — {label}</h3>
              <BarChart data={stats.orders} />
            </div>

            {/* Network distribution */}
            <div className="card" style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.125rem', margin: 0 }}>🌐 Network Distribution</h3>
              <NetworkBars data={stats.networkDistribution} />
            </div>

            {/* Recent orders */}
            <div className="card" style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', margin: 0 }}>📝 Recent Activity</h3>
              {stats.recentOrders?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No recent orders</div>
              ) : stats.recentOrders?.map((o, i) => (
                <div key={i} style={{ padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: '0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.reference}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>GH₵ {parseFloat(o.amount_paid).toFixed(2)}</div>
                    <span style={{ display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '700', marginTop: '0.15rem', background: `${statusColor(o.status)}22`, color: statusColor(o.status) }}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <style>{`
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
        .loading-spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Statistics;