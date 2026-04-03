import { useState, useEffect } from 'react';
import api from '../../api/axios';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'agent',
    phone: '',
    store_name: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/admin/users', formData);
      setMessage({ type: 'success', text: response.data.message });
      setFormData({ email: '', password: '', role: 'agent', phone: '', store_name: '' });
      setShowForm(false);
      fetchUsers();
      
      // Show registration link if created agent
      if (response.data.registration_link) {
        alert(`Registration Link:\n${response.data.registration_link}\n\nShare this with the new agent!`);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create user' });
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    const confirmText = prompt(`Type the email address to confirm deletion:\n${userEmail}`);
    
    if (!confirmText || confirmText !== userEmail) {
      alert('Email confirmation failed. User not deleted.');
      return;
    }

    const finalConfirm = confirm(`⚠️ WARNING: This action cannot be undone!\n\nDelete user: ${userEmail}?`);
    if (!finalConfirm) return;

    try {
      const response = await api.delete(`/admin/users/${userId}`, {
        data: { confirm_email: userEmail }
      });
      
      alert(response.data.message);
      fetchUsers(); // Refresh user list
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || 'Failed to delete user'));
    }
  };

  if (loading) {
    return <div className="dashboard-container"><div style={{padding: '2rem'}}>Loading...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div>
          <h1>User Management</h1>
          <p>Create and manage admins & agents</p>
        </div>
        <a href="/admin/dashboard" style={{color: '#3b82f6', textDecoration: 'none'}}>← Back</a>
        </nav>

      <main className="main-content">
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{marginBottom: '1.5rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600'}}
        >
          {showForm ? 'Cancel' : '+ Create New User'}
        </button>

        {showForm && (
          <div className="card" style={{marginBottom: '1.5rem'}}>
            <h2 style={{marginBottom: '1rem'}}>Create {formData.role === 'admin' ? 'Admin' : 'Agent'}</h2>
            {message.text && (
              <div style={{
                padding: '1rem',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
              }}>{message.text}</div>
            )}
            <form onSubmit={handleSubmit} style={{display: 'grid', gap: '1rem'}}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input" required />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Password</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input" required minLength="6" />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="input">
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input" placeholder="0240000000" />
                </div>
                {formData.role === 'agent' && (
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Store Name</label>
                    <input type="text" value={formData.store_name} onChange={(e) => setFormData({...formData, store_name: e.target.value})} className="input" placeholder="John's Data Store" />
                  </div>
                )}
              </div>
              <button type="submit" style={{padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600'}}>Create User</button>
            </form>
          </div>
        )}

        <div className="card">
          <h2 style={{marginBottom: '1rem'}}>All Users</h2>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{background: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Email</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Role</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Store Link</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Orders</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Sales</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Joined</th>
                  <th style={{padding: '0.75rem', textAlign: 'left'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                    <td style={{padding: '0.75rem'}}>{user.email}</td>
                    <td style={{padding: '0.75rem'}}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: user.role === 'admin' ? '#8b5cf6' : '#3b82f6',
                        color: 'white',
                        textTransform: 'uppercase',
                      }}>{user.role}</span>
                    </td>
                    <td style={{padding: '0.75rem'}}>
                      {user.store_slug ? (
                        <a href={`/store/${user.store_slug}`} target="_blank" rel="noopener noreferrer" style={{color: '#3b82f6'}}>
                          /store/{user.store_slug}
                        </a>
                      ) : <span style={{color: '#9ca3af'}}>—</span>}
                    </td>
                    <td style={{padding: '0.75rem'}}>{user.total_orders}</td>
                    <td style={{padding: '0.75rem', fontWeight: '600'}}>GH₵ {parseFloat(user.total_sales).toFixed(2)}</td>
                    <td style={{padding: '0.75rem', color: '#6b7280'}}>{new Date(user.created_at).toLocaleDateString()}</td>
                    
                    {/* ✅ NEW: Delete Action */}
                    <td style={{padding: '0.75rem'}}>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '0.375rem',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Users;