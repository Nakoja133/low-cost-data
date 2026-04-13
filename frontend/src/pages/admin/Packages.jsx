import { useState, useEffect } from 'react';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const NETWORKS = [
  { value: 'MTN',        color: '#fbbf24' },
  { value: 'Telecel',    color: '#ef4444' },
  { value: 'AirtelTigo', color: '#3b82f6' },
];

const Packages = () => {
  const [packages,         setPackages]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showCreateForm,   setShowCreateForm]   = useState(false);
  const [expandedCategory, setExpandedCategory] = useState('all');
  const [editingId,        setEditingId]        = useState(null);
  const [editData,         setEditData]         = useState({});
  const [message,          setMessage]          = useState({ type: '', text: '' });
  const [formData,         setFormData]         = useState({ network: 'MTN', gb: '', base_cost: '', base_price: '', is_active: true });

  // Calculate API code based on GB input
  const apiCodeMB = formData.gb ? Math.round(parseFloat(formData.gb) * 1000) : '';

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    try {
      const r = await api.get('/packages/all').catch(() => api.get('/packages'));
      setPackages(r.data.data || []);
    } catch {
      // Silent fail for demo
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // ── Create ────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    const gb = parseFloat(formData.gb);
    if (isNaN(gb) || gb <= 0) { showMsg('error', 'Enter a valid GB amount'); return; }
    
    try {
      await api.post('/admin/packages', {
        network:     formData.network,
        description: `${gb} GB`,
        base_cost:   formData.base_cost,
        base_price:  formData.base_price,
        api_code:    String(Math.round(gb * 1000)),
        is_active:   formData.is_active,
      });
      showMsg('success', 'Package created! Agents will be notified.');
      setFormData({ network: 'MTN', gb: '', base_cost: '', base_price: '', is_active: true });
      setShowCreateForm(false);
      fetchPackages();
    } catch (err) { 
      showMsg('error', err.response?.data?.error || 'Failed to create'); 
    }
  };

  // ── Start editing a package ────────────────────────────────────
  const startEdit = (pkg) => {
    setEditingId(pkg.id);
    const gbMatch = pkg.description?.match(/(\d+.?\d*)\s*GB/i);
    const gbVal   = gbMatch ? gbMatch[1] : '';
    setEditData({
      network:    pkg.network,
      gb:         gbVal,
      base_cost:  pkg.base_cost,
      base_price: pkg.base_price,
      is_active:  pkg.is_active,
    });
  };

  // ── Save edit ──────────────────────────────────────────────────
  const handleSaveEdit = async (pkgId) => {
    const gb = parseFloat(editData.gb);
    if (isNaN(gb) || gb <= 0) { showMsg('error', 'Enter a valid GB amount'); return; }
    
    try {
      await api.put(`/admin/packages/${pkgId}`, {
        network:     editData.network,
        description: `${gb} GB`,
        base_cost:   editData.base_cost,
        base_price:  editData.base_price,
        api_code:    String(Math.round(gb * 1000)),
        is_active:   editData.is_active,
      });
      showMsg('success', 'Package updated! Agents notified.');
      setEditingId(null);
      fetchPackages();
    } catch (err) { 
      showMsg('error', err.response?.data?.error || 'Failed to update'); 
    }
  };

  const toggleActive = async (id, current) => {
    try {
      await api.put(`/admin/packages/${id}`, { is_active: !current });
      fetchPackages();
    } catch (err) { 
      showMsg('error', 'Failed to toggle status'); 
    }
  };

  // Group packages by network
  const grouped = {};
  NETWORKS.forEach(n => { 
    grouped[n.value] = packages.filter(p => p.network === n.value); 
  });

  const inputSt = { 
    width: '100%', 
    padding: '0.75rem 1rem', 
    border: '1px solid var(--border-color)', 
    borderRadius: '0.5rem', 
    background: 'var(--bg-secondary)', 
    color: 'var(--text-primary)', 
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  };
  
  const labelSt = { display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-secondary)' };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/admin/packages" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>📦 Package Management</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Create and manage data bundles</p>
          </div>
          <button 
            onClick={() => setShowCreateForm(f => !f)} 
            style={{ 
              padding: '0.75rem 1.5rem', 
              background: showCreateForm ? 'var(--bg-tertiary)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
              color: showCreateForm ? 'var(--text-primary)' : 'white', 
              border: showCreateForm ? '1px solid var(--border-color)' : 'none', 
              borderRadius: '0.625rem', 
              cursor: 'pointer', 
              fontWeight: '700',
              fontSize: '0.9rem'
            }}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create Package'}
          </button>
        </div>

        {/* Messages */}
        {message.text && (
          <div style={{ 
            padding: '0.875rem 1rem', 
            borderRadius: '0.625rem', 
            marginBottom: '1.25rem', 
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, 
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)', 
            fontWeight: '600' 
          }}>
            {message.text}
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeSlide 0.25s ease', background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontWeight: '700', marginBottom: '1.25rem', marginTop: 0 }}>✨ Create New Package</h3>
            <form onSubmit={handleCreate} autoComplete="off"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              
              <div>
                <label style={labelSt}>Network</label>
                <select value={formData.network} onChange={e => setFormData({ ...formData, network: e.target.value })} style={inputSt}>
                  {NETWORKS.map(n => <option key={n.value} value={n.value}>{n.value}</option>)}
                </select>
              </div>
              
              <div>
                <label style={labelSt}>Package (GB)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  value={formData.gb} 
                  onChange={e => setFormData({ ...formData, gb: e.target.value })} 
                  style={inputSt} 
                  placeholder="e.g. 2" 
                  required 
                />
                {formData.gb && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>API code: {Math.round(parseFloat(formData.gb || 0) * 1000)} MB</p>}
              </div>
              
              <div>
                <label style={labelSt}>Cost Price (GH₵)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.base_cost} 
                  onChange={e => setFormData({ ...formData, base_cost: e.target.value })} 
                  style={inputSt} 
                  placeholder="4.30" 
                  required 
                />
              </div>
              
              <div>
                <label style={labelSt}>Base Price (GH₵)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.base_price} 
                  onChange={e => setFormData({ ...formData, base_price: e.target.value })} 
                  style={inputSt} 
                  placeholder="6.00" 
                  required 
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.is_active} 
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })} 
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1' }} 
                  />
                  Active
                </label>
              </div>
              
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  style={{ 
                    padding: '0.875rem 2rem', 
                    background: 'linear-gradient(135deg,#10b981,#059669)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.625rem', 
                    fontWeight: '700', 
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  ✓ Create Package
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setExpandedCategory('all')} 
            style={{ 
              padding: '0.6rem 1.125rem', 
              borderRadius: '2rem', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: '600', 
              background: expandedCategory === 'all' ? 'var(--primary)' : 'var(--bg-tertiary)', 
              color: expandedCategory === 'all' ? 'white' : 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            All ({packages.length})
          </button>
          {NETWORKS.map(n => (
            <button 
              key={n.value} 
              onClick={() => setExpandedCategory(n.value)} 
              style={{ 
                padding: '0.6rem 1.125rem', 
                borderRadius: '2rem', 
                border: 'none', 
                cursor: 'pointer', 
                fontWeight: '600', 
                background: expandedCategory === n.value ? n.color : 'var(--bg-tertiary)', 
                color: expandedCategory === n.value ? 'white' : 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              {n.value} ({(grouped[n.value] || []).length})
            </button>
          ))}
        </div>

        {/* Packages by network */}
        {NETWORKS.map(net => {
          const pkgs = grouped[net.value] || [];
          if (!pkgs.length) return null;
          const isVisible = expandedCategory === 'all' || expandedCategory === net.value;
          if (!isVisible) return null;
          
          return (
            <div key={net.value} className="card" style={{ marginBottom: '1.5rem', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden', borderLeft: `4px solid ${net.color}` }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: net.color, padding: '1rem 1.5rem 0.5rem', margin: 0 }}>
                {net.value} Packages
              </h3>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Package</th>
                      <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Price</th>
                      <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base Price</th>
                      <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In MB</th>
                      <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkgs.map(pkg => (
                      <>
                        <tr key={pkg.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{pkg.description}</td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>GH₵ {parseFloat(pkg.base_cost).toFixed(2)}</td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>GH₵ {parseFloat(pkg.base_price).toFixed(2)}</td>
                          <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pkg.api_code}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ 
                              padding: '0.25rem 0.75rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.72rem', 
                              fontWeight: '700', 
                              background: pkg.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', 
                              color: pkg.is_active ? 'var(--success)' : 'var(--text-muted)' 
                            }}>
                              {pkg.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => editingId === pkg.id ? setEditingId(null) : startEdit(pkg)} 
                                style={{ 
                                  padding: '0.375rem 0.875rem', 
                                  background: editingId === pkg.id ? 'var(--bg-tertiary)' : 'rgba(99,102,241,0.1)', 
                                  border: `1px solid ${editingId === pkg.id ? 'var(--border-color)' : 'rgba(99,102,241,0.3)'}`, 
                                  borderRadius: '0.375rem', 
                                  color: editingId === pkg.id ? 'var(--text-secondary)' : 'var(--primary)', 
                                  cursor: 'pointer', 
                                  fontSize: '0.78rem', 
                                  fontWeight: '600' 
                                }}
                              >
                                {editingId === pkg.id ? '✕ Cancel' : '✏️ Edit'}
                              </button>
                              <button 
                                onClick={() => toggleActive(pkg.id, pkg.is_active)} 
                                style={{ 
                                  padding: '0.375rem 0.875rem', 
                                  background: pkg.is_active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', 
                                  border: `1px solid ${pkg.is_active ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, 
                                  borderRadius: '0.375rem', 
                                  color: pkg.is_active ? 'var(--warning)' : 'var(--success)', 
                                  cursor: 'pointer', 
                                  fontSize: '0.78rem', 
                                  fontWeight: '600' 
                                }}
                              >
                                {pkg.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Inline edit row */}
                        {editingId === pkg.id && (
                          <tr key={`edit-${pkg.id}`} style={{ background: 'var(--bg-secondary)' }}>
                            <td colSpan="6" style={{ padding: '1.25rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                  <label style={labelSt}>Network</label>
                                  <select value={editData.network} onChange={e => setEditData({ ...editData, network: e.target.value })} style={inputSt}>
                                    {NETWORKS.map(n => <option key={n.value} value={n.value}>{n.value}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={labelSt}>Package (GB)</label>
                                  <input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    value={editData.gb} 
                                    onChange={e => setEditData({ ...editData, gb: e.target.value })} 
                                    style={inputSt} 
                                  />
                                  {editData.gb && <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>→ {Math.round(parseFloat(editData.gb || 0) * 1000)} MB</p>}
                                </div>
                                <div>
                                  <label style={labelSt}>Cost Price (GH₵)</label>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    value={editData.base_cost} 
                                    onChange={e => setEditData({ ...editData, base_cost: e.target.value })} 
                                    style={inputSt} 
                                  />
                                </div>
                                <div>
                                  <label style={labelSt}>Base Price (GH₵)</label>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    value={editData.base_price} 
                                    onChange={e => setEditData({ ...editData, base_price: e.target.value })} 
                                    style={inputSt} 
                                  />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={editData.is_active} 
                                      onChange={e => setEditData({ ...editData, is_active: e.target.checked })} 
                                      style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                                    />
                                    Active
                                  </label>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleSaveEdit(pkg.id)} 
                                style={{ 
                                  padding: '0.75rem 2rem', 
                                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '0.625rem', 
                                  fontWeight: '700', 
                                  cursor: 'pointer', 
                                  fontSize: '0.9rem' 
                                }}
                              >
                                💾 Save Changes
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </main>

      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
      `}</style>
    </div>
  );
};

export default Packages;