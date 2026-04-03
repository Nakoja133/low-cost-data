import { useState, useEffect } from 'react';
import api from '../../api/axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-container"><div style={{padding: '2rem'}}>Loading...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div>
          <h1>All Orders</h1>
          <p>View all transactions</p>
        </div>
        <a href="/admin/dashboard" style={{color: '#3b82f6', textDecoration: 'none'}}>← Back</a>
      </nav>

      <main className="main-content">
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
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{padding: '2rem', textAlign: 'center', color: '#6b7280'}}>
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                      <td style={{padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem'}}>
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
                          background: order.status === 'completed' ? '#10b981' : 
                                     order.status === 'pending' ? '#f59e0b' : '#ef4444',
                          color: 'white',
                        }}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{padding: '0.75rem', color: '#6b7280'}}>
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Orders;