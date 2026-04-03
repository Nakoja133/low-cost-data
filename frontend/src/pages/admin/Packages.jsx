import { useState, useEffect } from 'react';
import api from '../../api/axios';

const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState('all');
  const [formData, setFormData] = useState({
    network: 'MTN',
    description: '',
    base_cost: '',
    base_price: '',
    api_code: '',
    is_active: true,
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await api.get('/packages');
      setPackages(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await api.post('/admin/packages', formData);
      setMessage({ type: 'success', text: 'Package created successfully!' });
      setFormData({ network: 'MTN', description: '', base_cost: '', base_price: '', api_code: '', is_active: true });
      setShowForm(false);
      fetchPackages();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create package' });
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/admin/packages/${id}`, { is_active: !currentStatus });
      fetchPackages();
    } catch (error) {
      console.error('Update error:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to update'));
    }
  };

  // Group packages by network
  const groupedPackages = {
    MTN: packages.filter(p => p.network === 'MTN'),
    Telecel: packages.filter(p => p.network === 'Telecel'),
    AirtelTigo: packages.filter(p => p.network === 'AirtelTigo'),
  };

  const categories = [
    { key: 'MTN', label: 'MTN', color: '#fbbf24', count: groupedPackages.MTN.length },
    { key: 'Telecel', label: 'Telecel', color: '#ef4444', count: groupedPackages.Telecel.length },
    { key: 'AirtelTigo', label: 'AirtelTigo', color: '#3b82f6', count: groupedPackages.AirtelTigo.length },
  ];

  if (loading) {
    return <div className="dashboard-container"><div style={{padding: '2rem'}}>Loading...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div>
          <h1>Package Management</h1>
          <p>Create and manage data bundles</p>
        </div>
        <a href="/admin/dashboard" style={{color: '#3b82f6', textDecoration: 'none'}}>← Back</a>
        </nav>

      <main className="main-content">
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{marginBottom: '1.5rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600'}}
        >
          {showForm ? 'Cancel' : '+ Create New Package'}
        </button>

        {showForm && (
          <div className="card" style={{marginBottom: '1.5rem'}}>
            <h2 style={{marginBottom: '1rem'}}>Create New Package</h2>
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
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Network</label>
                  <select value={formData.network} onChange={(e) => setFormData({...formData, network: e.target.value})} className="input" required>
                    <option value="MTN">MTN</option>
                    <option value="Telecel">Telecel</option>
                    <option value="AirtelTigo">AirtelTigo</option>
                  </select>
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Description</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="input" placeholder="1GB Valid 30 Days" required />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Base Cost (GH₵)</label>
                  <input type="number" step="0.01" value={formData.base_cost} onChange={(e) => setFormData({...formData, base_cost: e.target.value})} className="input" placeholder="4.30" required />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Base Price (GH₵)</label>
                  <input type="number" step="0.01" value={formData.base_price} onChange={(e) => setFormData({...formData, base_price: e.target.value})} className="input" placeholder="6.00" required />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>API Code (MB)</label>
                  <input type="text" value={formData.api_code} onChange={(e) => setFormData({...formData, api_code: e.target.value})} className="input" placeholder="1000" required />
                </div>
                <div style={{display: 'flex', alignItems: 'flex-end'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                    <span>Active</span>
                  </label>
                </div>
              </div>
              <button type="submit" style={{padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600'}}>Create Package</button>
            </form>
          </div>
        )}

        {/* Category Filter Buttons */}
        <div style={{marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          <button
            onClick={() => setExpandedCategory('all')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              background: expandedCategory === 'all' ? '#3b82f6' : '#e5e7eb',
              color: expandedCategory === 'all' ? 'white' : '#374151',
              fontWeight: '600',
            }}
          >
            All Packages ({packages.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setExpandedCategory(cat.key)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                background: expandedCategory === cat.key ? cat.color : '#e5e7eb',
                color: expandedCategory === cat.key ? 'white' : '#374151',
                fontWeight: '600',
              }}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Packages by Category */}
        {categories.map(category => {
          const isExpanded = expandedCategory === 'all' || expandedCategory === category.key;
          const categoryPackages = groupedPackages[category.key];
          
          if (categoryPackages.length === 0) return null;

          return (
            <div key={category.key} className="card" style={{marginBottom: '1.5rem', borderLeft: `4px solid ${category.color}`}}>
              <div 
                onClick={() => setExpandedCategory(isExpanded && expandedCategory !== 'all' ? 'all' : category.key)}
                style={{cursor: 'pointer', marginBottom: '1rem'}}
              >
                <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', color: category.color}}>
                  {category.label} Packages
                  <span style={{marginLeft: '0.5rem', fontSize: '0.875rem', color: '#6b7280'}}>({categoryPackages.length})</span>
                </h2>
              </div>

              {isExpanded && (
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{background: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Description</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Cost</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Price</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>API Code</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Status</th>
                        <th style={{padding: '0.75rem', textAlign: 'left'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryPackages.map(pkg => (
                        <tr key={pkg.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                          <td style={{padding: '0.75rem'}}>{pkg.description}</td>
                          <td style={{padding: '0.75rem', fontWeight: '600'}}>GH₵ {parseFloat(pkg.base_cost).toFixed(2)}</td>
                          <td style={{padding: '0.75rem', fontWeight: '600'}}>GH₵ {parseFloat(pkg.base_price).toFixed(2)}</td>
                          <td style={{padding: '0.75rem', fontFamily: 'monospace'}}>{pkg.api_code}</td>
                          <td style={{padding: '0.75rem'}}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: pkg.is_active ? '#10b981' : '#9ca3af',
                              color: 'white',
                            }}>
                              {pkg.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{padding: '0.75rem'}}>
                            <button 
                              onClick={() => toggleActive(pkg.id, pkg.is_active)}
                              style={{padding: '0.25rem 0.75rem', background: pkg.is_active ? '#f59e0b' : '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600'}}
                            >
                              {pkg.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default Packages;