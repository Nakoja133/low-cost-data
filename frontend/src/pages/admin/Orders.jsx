import { useState, useEffect } from 'react';
import api from '../../api/axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [sortBy, setSortBy] = useState('network');

  useEffect(() => {
    fetchOrders();
  }, []);

  const groupOrders = (ordersData, criteria) => {
    const grouped = {};
    ordersData.forEach(order => {
      const key = criteria === 'status' ? (order.status || 'unknown') : (order.network || 'Unknown');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(order);
    });
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        if (criteria === 'status') return a.network?.localeCompare(b.network || '') || 0;
        return a.status?.localeCompare(b.status || '') || 0;
      });
    });
    return grouped;
  };

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

  const getNetworkColor = (network) => {
    const colors = {
      'MTN': '#fbbf24',
      'Telecel': '#ef4444',
      'AirtelTigo': '#3b82f6',
      'Vodafone': '#10b981',
    };
    return colors[network] || '#8b5cf6';
  };

  if (loading) {
    return <div className="dashboard-container"><div style={{padding: '2rem'}}>Loading...</div></div>;
  }

  const groups = Object.keys(groupedOrders).sort();

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div>
          <h1>All Orders</h1>
          <p>View all transactions grouped by {sortBy === 'status' ? 'status' : 'network'}</p>
        </div>
        <a href="/admin/dashboard" style={{color: '#3b82f6', textDecoration: 'none'}}>← Back</a>
      </nav>
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center', margin:'1rem 0' }}>
        <label style={{ fontSize:'0.9rem', color:'var(--text-secondary)' }}>Sort by</label>
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setGroupedOrders(groupOrders(orders, e.target.value)); }} style={{ padding:'0.65rem 0.85rem', borderRadius:'0.75rem', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-primary)' }}>
          <option value="network">Network</option>
          <option value="status">Status</option>
        </select>
      </div>

      <main className="main-content">
        {groups.length === 0 ? (
          <div className="card" style={{textAlign: 'center', padding: '3rem', color: '#6b7280'}}>
            <p style={{fontSize: '1.1rem'}}>No orders yet</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group} style={{marginBottom: '2rem'}}>
              {/* Group Header */}
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingLeft: '1rem'}}>
                <div style={{width: '12px', height: '12px', borderRadius: '50%', background: getNetworkColor(group)}} />
                <h2 style={{fontSize: '1.1rem', fontWeight: '700', margin: 0}}>{group}</h2>
                <span style={{background: 'var(--bg-secondary)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)'}}>
                  {groupedOrders[group].length} orders
                </span>
              </div>

              {/* Orders Table for this Network */}
              <div className="card">
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{background: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Reference</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Customer</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Package</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Amount</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Status</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedOrders[group].map(order => (
                        <tr key={order.id} style={{borderBottom: '1px solid #e5e7eb', transition: 'background 0.15s'}}>
                          <td style={{padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '600'}}>
                            {order.reference}
                          </td>
                          <td style={{padding: '0.75rem'}}>{order.customer_phone}</td>
                          <td style={{padding: '0.75rem'}}>{order.package_id}</td>
                          <td style={{padding: '0.75rem', fontWeight: '600'}}>
                            GH₵ {parseFloat(order.amount_paid).toFixed(2)}
                          </td>
                          <td style={{padding: '0.75rem'}}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: order.status === 'completed' ? '#d1fae5' :
                                         order.status === 'pending' ? '#fef3c7' : '#fee2e2',
                              color: order.status === 'completed' ? '#065f46' :
                                     order.status === 'pending' ? '#92400e' : '#991b1b',
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem'}}>
                            {new Date(order.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default Orders;