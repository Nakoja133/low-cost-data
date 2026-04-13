import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [sortBy, setSortBy] = useState('network');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      const ordersData = response.data.data || response.data || [];
      setOrders(ordersData);
      setGroupedOrders(groupOrders(ordersData, sortBy));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupOrders = (ordersData, criteria) => {
    const grouped = {};
    ordersData.forEach(order => {
      const key = criteria === 'status' ? (order.status || 'unknown') : (order.network || 'Unknown');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(order);
    });
    return grouped;
  };

  const getNetworkColor = (network) => {
    const colors = {
      'MTN': '#fbbf24',
      'Telecel': '#ef4444',
      'AirtelTigo': '#3b82f6',
      'Vodafone': '#10b981',
    };
    return colors[network] || '#8b5cf6';
  };

  const getStatusStyle = (status) => {
    const lowerStatus = status?.toLowerCase();
    if (lowerStatus === 'completed' || lowerStatus === 'success') {
      return { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' };
    }
    if (lowerStatus === 'pending') {
      return { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' };
    }
    return { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' };
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const groups = Object.keys(groupedOrders);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/admin/orders" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>📊 All Orders</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
              View all transactions grouped by {sortBy === 'status' ? 'status' : 'network'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => navigate('/admin/dashboard')} style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
              ← Dashboard
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Group By:</label>
              <select 
                value={sortBy} 
                onChange={(e) => { 
                  setSortBy(e.target.value); 
                  setGroupedOrders(groupOrders(orders, e.target.value)); 
                }} 
                style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <option value="network">Network</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Groups */}
        {groups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No orders found</p>
          </div>
        ) : (
          groups.map(group => {
            const groupOrdersList = groupedOrders[group];
            // For network group, we can show the dot color. For status, maybe just text or generic icon.
            const isNetwork = sortBy === 'network';
            const color = isNetwork ? getNetworkColor(group) : (getStatusStyle(group)?.color || '#8b5cf6');

            return (
              <div key={group} style={{ marginBottom: '2rem' }}>
                {/* Group Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>{group}</h3>
                  <span style={{ background: 'var(--bg-secondary)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {groupOrdersList.length} orders
                  </span>
                </div>

                {/* Orders Table */}
                <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reference</th>
                          <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Customer</th>
                          <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Package</th>
                          <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount</th>
                          <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                          <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupOrdersList.map(order => {
                          const statusStyle = getStatusStyle(order.status);
                          return (
                            <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                              <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {order.reference}
                              </td>
                              <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                {order.customer_phone}
                              </td>
                              <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                                {order.package_id}
                              </td>
                              <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                GH₵ {parseFloat(order.amount_paid).toFixed(2)}
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  background: statusStyle.bg,
                                  color: statusStyle.color,
                                  textTransform: 'capitalize'
                                }}>
                                  {order.status}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                {new Date(order.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      <style>{`
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-color);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
      `}</style>
    </div>
  );
};

export default Orders;