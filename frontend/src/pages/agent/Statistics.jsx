import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const Statistics = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('weekly'); // daily, weekly, monthly, yearly
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    uniqueCustomers: 0,
    orders: [],
  });

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/agent/statistics', {
        params: { range: timeRange }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simple bar chart visualization
  const renderBarChart = (data, label) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginTop: '1rem',
      }}>
        <h4 style={{fontSize: '0.9rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)'}}>
          {label}
        </h4>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: '150px',
          gap: '0.5rem',
        }}>
          {data.map((item, index) => (
            <div key={index} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <div style={{
                width: '100%',
                background: 'linear-gradient(180deg, var(--primary) 0%, var(--primary-hover) 100%)',
                borderRadius: '0.25rem 0.25rem 0 0',
                height: `${(item.value / maxValue) * 100}%`,
                minHeight: '4px',
                transition: 'height 0.3s ease',
              }} />
              <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                marginTop: '0.5rem',
                textAlign: 'center',
                transform: 'rotate(-45deg)',
                transformOrigin: 'top left',
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Pie chart visualization (simplified)
  const renderPieChart = (data) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginTop: '1rem',
      }}>
        <h4 style={{fontSize: '0.9rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)'}}>
          Network Distribution
        </h4>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
          {data.map((item, index) => (
            <div key={index}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem'}}>
                <span style={{color: 'var(--text-primary)'}}>{item.label}</span>
                <span style={{color: 'var(--text-secondary)'}}>
                  {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
              <div style={{
                height: '8px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(item.value / total) * 100}%`,
                  height: '100%',
                  background: colors[index % colors.length],
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/agent/statistics" />
      
      <main className="main-content" style={{paddingTop: '1rem'}}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <h2 style={{fontSize: '1.25rem', fontWeight: '700'}}>📈 Statistics</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading statistics...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                background: 'var(--card-bg)',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid var(--primary)',
              }}>
                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Total Orders</div>
                <div style={{fontSize: '1.75rem', fontWeight: '700', color: 'var(--primary)'}}>{stats.totalOrders}</div>
              </div>
              <div style={{
                background: 'var(--card-bg)',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid var(--success)',
              }}>
                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Total Revenue</div>
                <div style={{fontSize: '1.75rem', fontWeight: '700', color: 'var(--success)'}}>GH₵ {stats.totalRevenue?.toFixed(2) || '0.00'}</div>
              </div>
              <div style={{
                background: 'var(--card-bg)',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid var(--warning)',
              }}>
                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Total Profit</div>
                <div style={{fontSize: '1.75rem', fontWeight: '700', color: 'var(--warning)'}}>GH₵ {stats.totalProfit?.toFixed(2) || '0.00'}</div>
              </div>
              <div style={{
                background: 'var(--card-bg)',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid var(--info)',
              }}>
                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Unique Customers</div>
                <div style={{fontSize: '1.75rem', fontWeight: '700', color: 'var(--info)'}}>{stats.uniqueCustomers || 0}</div>
              </div>
            </div>

            {/* Charts */}
            <div className="card">
              <h3 style={{fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem'}}>📊 Order Trends</h3>
              {renderBarChart(stats.orders, 'Orders Over Time')}
            </div>

            <div className="card">
              <h3 style={{fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem'}}>🌐 Network Distribution</h3>
              {stats.networkDistribution && renderPieChart(stats.networkDistribution)}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <h3 style={{fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem'}}>📝 Recent Activity</h3>
              {stats.recentOrders && stats.recentOrders.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  {stats.recentOrders.slice(0, 5).map((order, index) => (
                    <div key={index} style={{
                      padding: '1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{fontWeight: '600', fontSize: '0.9rem'}}>{order.reference}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{fontWeight: '700', color: 'var(--primary)'}}>
                        GH₵ {parseFloat(order.amount_paid).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                  No recent activity
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Statistics;