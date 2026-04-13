import { useState, useEffect, useRef } from 'react';
import { useFeedback } from '../../context/FeedbackContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const RANGE_LABELS = { daily:'Daily', weekly:'Weekly', monthly:'Monthly', yearly:'Yearly' };
const NET_COLORS   = { MTN:'#fbbf24', Telecel:'#ef4444', AirtelTigo:'#3b82f6' };

const Users = () => {
  const { showPrompt, showSuccess, showError } = useFeedback();
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [message,   setMessage]   = useState({ type:'', text:'' });
  const [search,    setSearch]    = useState('');
  const [formData,  setFormData]  = useState({ email:'', password:'', role:'agent', username:'', phone:'', store_name:'' });
  
  // Agent stats modal
  const [selectedAgent,  setSelectedAgent]  = useState(null);
  const [agentStats,     setAgentStats]     = useState(null);
  const [statsLoading,   setStatsLoading]   = useState(false);
  const [statsRange,     setStatsRange]     = useState('weekly');

  const formRef = useRef(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const r = await api.get('/admin/users'); setUsers(r.data.data || []); }
    catch { } finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({ email:'', password:'', role:'agent', username:'', phone:'', store_name:'' });
    if (formRef.current) formRef.current.reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type:'', text:'' });
    try {
      const r = await api.post('/admin/users', formData);
      setMessage({ type:'success', text:r.data.message });
      resetForm(); setShowForm(false); fetchUsers();
    } catch (err) { setMessage({ type:'error', text:err.response?.data?.error || 'Failed' }); }
  };

  const handleDelete = async (userId, userEmail) => {
    const confirmText = await showPrompt({
      title: 'Delete User',
      message: `Type ${userEmail} to confirm deletion. This action cannot be undone.`,
      label: 'Confirmation email',
      placeholder: userEmail,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
      validate: (value) => value.trim() === userEmail ? '' : 'Enter the exact email to continue.',
    });
    if (confirmText === null) return;
    try {
      await api.delete(`/admin/users/${userId}`, { data:{ confirm_email:userEmail } });
      showSuccess(`${userEmail} deleted successfully.`);
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  // Open agent stats modal
  const openAgentStats = async (agent, range = 'weekly') => {
    if (agent.role !== 'agent') return; // admin rows not clickable
    setSelectedAgent(agent);
    setStatsRange(range);
    setStatsLoading(true);
    setAgentStats(null);
    try {
      const r = await api.get(`/admin/users/${agent.id}/stats`, { params:{ range } });
      setAgentStats(r.data);
    } catch { setAgentStats(null); }
    finally { setStatsLoading(false); }
  };

  const changeStatsRange = (range) => {
    setStatsRange(range);
    if (selectedAgent) openAgentStats(selectedAgent, range);
  };

  // Mini bar chart for modal
  const MiniBar = ({ data }) => {
    if (!data?.length) return <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'1rem' }}>No data</p>;
    const max = Math.max(...data.map(d => d.value), 1);
    return (
      <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'80px', paddingBottom:'16px' }}>
        {data.map((item, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end' }}>
            <div 
              title={`${item.label}: ${item.value}`} 
              style={{ 
                width:'100%', 
                background:'linear-gradient(180deg,var(--primary),#4f46e5)', 
                borderRadius:'3px 3px 0 0', 
                height:`${Math.max((item.value/max)*100,3)}%`, 
                minHeight:'3px', 
                transition:'height 0.4s' 
              }} 
            />
            <div style={{ fontSize:'0.55rem', color:'var(--text-muted)', marginTop:'3px', transform:'rotate(-40deg)', transformOrigin:'top left', whiteSpace:'nowrap', overflow:'hidden', maxWidth:'24px' }}>{item.label}</div>
          </div>
        ))}
      </div>
    );
  };

  const inputSt  = { width:'100%', padding:'0.75rem 1rem', border:'1px solid var(--border-color)', borderRadius:'0.5rem', background:'var(--bg-secondary)', color:'var(--text-primary)', fontSize:'0.95rem' };
  const labelSt  = { display:'block', marginBottom:'0.35rem', fontWeight:'600', fontSize:'0.82rem', color:'var(--text-secondary)' };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg-primary)' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)' }}>
      <MobileMenu currentPage="/admin/users" />

      {/* ── Agent Stats Modal ──────────────────────────────── */}
      {selectedAgent && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:998, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'1rem', paddingTop:'4rem', overflowY:'auto' }} onClick={e => e.target === e.currentTarget && setSelectedAgent(null)}>
          <div style={{ background:'var(--card-bg)', borderRadius:'1.25rem', maxWidth:'560px', width:'100%', border:'1px solid var(--border-color)', boxShadow:'0 25px 60px rgba(0,0,0,0.4)', overflow:'hidden', animation:'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
            
            {/* Modal Header */}
            <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', padding:'1.25rem 1.5rem', color:'white', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:'1.75rem', marginBottom:'0.2rem' }}>👤</div>
                <h3 style={{ fontWeight:'800', fontSize:'1.05rem', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{selectedAgent.username || selectedAgent.email}</h3>
                <p style={{ opacity:0.85, fontSize:'0.78rem', margin:'0.15rem 0 0' }}>{selectedAgent.email} · {selectedAgent.store_name || selectedAgent.store_slug || '—'}</p>
              </div>
              <div style={{ display:'flex', gap:'0.5rem', alignItems:'flex-start', marginLeft:'1rem' }}>
                <select value={statsRange} onChange={e => changeStatsRange(e.target.value)} style={{ padding:'0.4rem 0.875rem', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'0.5rem', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                  {Object.entries(RANGE_LABELS).map(([v,l]) => <option key={v} value={v} style={{ background:'var(--card-bg)', color:'var(--text-primary)' }}>{l}</option>)}
                </select>
                <button onClick={() => { setSelectedAgent(null); setAgentStats(null); }} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:'32px', height:'32px', color:'white', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding:'1.25rem 1.5rem', maxHeight:'65vh', overflowY:'auto' }}>
              {statsLoading ? (
                <div className="loading">Loading statistics...</div>
              ) : agentStats ? (
                <>
                  {/* Withdrawal summary */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1.25rem' }}>
                    {[
                      { label:`Withdrawals made`,    value:agentStats.totalWithdrawals,                             color:'#8b5cf6' },
                      { label:`Total withdrawn`,     value:`GH₵ ${parseFloat(agentStats.totalWithdrawn).toFixed(2)}`, color:'#ef4444' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'var(--bg-secondary)', padding:'1rem', borderRadius:'0.75rem', border:'1px solid var(--border-color)', borderTop:`3px solid ${s.color}` }}>
                        <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginBottom:'0.3rem' }}>{s.label}</div>
                        <div style={{ fontSize:'1.1rem', fontWeight:'800', color:s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.75rem', marginBottom:'1.25rem' }}>
                    {[
                      { label:`Orders (${RANGE_LABELS[statsRange]})`,  value:agentStats.totalOrders,                              color:'var(--primary)' },
                      { label:`Revenue (${RANGE_LABELS[statsRange]})`, value:`GH₵ ${parseFloat(agentStats.totalRevenue).toFixed(2)}`, color:'var(--info)' },
                      { label:`Profit  (${RANGE_LABELS[statsRange]})`,  value:`GH₵ ${parseFloat(agentStats.totalProfit).toFixed(2)}`,  color:'var(--success)' },
                      { label:'Unique Customers',                       value:agentStats.uniqueCustomers,                          color:'var(--warning)' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'var(--bg-secondary)', padding:'1rem', borderRadius:'0.75rem', border:'1px solid var(--border-color)', borderTop:`3px solid ${s.color}` }}>
                        <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)', marginBottom:'0.3rem' }}>{s.label}</div>
                        <div style={{ fontSize:'1.05rem', fontWeight:'800', color:s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Order trend */}
                  <div style={{ background:'var(--bg-secondary)', borderRadius:'0.75rem', padding:'1rem', marginBottom:'1rem' }}>
                    <h4 style={{ fontSize:'0.85rem', fontWeight:'700', marginBottom:'0.875rem' }}>📊 Order Trend</h4>
                    <MiniBar data={agentStats.orders} />
                  </div>

                  {/* Network distribution */}
                  {agentStats.networkDistribution?.length > 0 && (
                    <div style={{ background:'var(--bg-secondary)', borderRadius:'0.75rem', padding:'1rem' }}>
                      <h4 style={{ fontSize:'0.85rem', fontWeight:'700', marginBottom:'0.875rem' }}>🌐 Network Distribution</h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
                        {agentStats.networkDistribution.map((item, i) => {
                          const total = agentStats.networkDistribution.reduce((s,d) => s+d.value, 0);
                          const pct   = total > 0 ? ((item.value/total)*100).toFixed(1) : 0;
                          const color = NET_COLORS[item.label] || '#8b5cf6';
                          return (
                            <div key={i}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.25rem', fontSize:'0.82rem' }}>
                                <span style={{ fontWeight:'600' }}>{item.label}</span>
                                <span style={{ color:'var(--text-secondary)' }}>{item.value} ({pct}%)</span>
                              </div>
                              <div style={{ height:'7px', background:'var(--bg-tertiary)', borderRadius:'4px', overflow:'hidden' }}>
                                <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:'4px', transition:'width 0.4s' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ textAlign:'center', color:'var(--danger)', padding:'2rem' }}>Failed to load agent statistics</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="main-content" style={{ padding:'1.5rem', maxWidth:'1200px', margin:'0 auto' }}>
        
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h2 style={{ fontSize:'1.4rem', fontWeight:'800', margin:0 }}>👥 User Management</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem', margin:'0.25rem 0 0' }}>Click an agent row to view their statistics</p>
          </div>
          <button onClick={() => { setShowForm(f => !f); setMessage({ type:'',text:'' }); if (showForm) resetForm(); }}
            style={{ padding:'0.75rem 1.5rem', background:showForm?'var(--bg-tertiary)':'linear-gradient(135deg,#6366f1,#8b5cf6)', color:showForm?'var(--text-primary)':'white', border:showForm?'1px solid var(--border-color)':'none', borderRadius:'0.625rem', cursor:'pointer', fontWeight:'700' }}>
            {showForm ? '✕ Cancel' : '+ Create New User'}
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username, store name, or phone"
            style={{ flex:1, minWidth:'220px', padding:'0.75rem 1rem', border:'1px solid var(--border-color)', borderRadius:'0.75rem', background:'var(--bg-secondary)', color:'var(--text-primary)', fontSize:'0.95rem' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ padding:'0.75rem 1rem', border:'1px solid var(--border-color)', borderRadius:'0.75rem', background:'var(--bg-tertiary)', color:'var(--text-primary)', cursor:'pointer', fontWeight:'600' }}>
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        {message.text && (
          <div style={{ padding:'0.875rem 1rem', borderRadius:'0.625rem', marginBottom:'1.25rem', background:message.type==='success'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${message.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, color:message.type==='success'?'var(--success)':'var(--danger)', fontWeight:'600' }}>
            {message.text}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="card" style={{ marginBottom:'1.5rem', animation:'fadeSlide 0.25s ease', background:'var(--card-bg)', padding:'1.5rem', borderRadius:'1rem', border:'1px solid var(--border-color)' }}>
            <h3 style={{ fontWeight:'700', marginBottom:'1.25rem', marginTop:0 }}>✨ Create {formData.role==='admin'?'Admin':'Agent'} Account</h3>
            <form ref={formRef} onSubmit={handleSubmit} autoComplete="off"
              style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1rem' }}>
              
              <div> 
                <label style={labelSt}>Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData,role:e.target.value})} style={inputSt}>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div> 
                <label style={labelSt}>Username</label>
                <input type="text" autoComplete="off" value={formData.username} onChange={e => setFormData({...formData,username:e.target.value})} style={inputSt} placeholder="Display name" />
              </div>
              
              <div> 
                <label style={labelSt}>Email *</label>
                <input type="email" name="new-email" autoComplete="new-password" value={formData.email} onChange={e => setFormData({...formData,email:e.target.value})} style={inputSt} placeholder="agent@example.com" readOnly onFocus={e=>e.target.removeAttribute('readonly')} required />
              </div>
              
              <div> 
                <label style={labelSt}>Password *</label>
                <input type="password" name="new-password" autoComplete="new-password" value={formData.password} onChange={e => setFormData({...formData,password:e.target.value})} style={inputSt} placeholder="Min 6 characters" readOnly onFocus={e=>e.target.removeAttribute('readonly')} required minLength="6" />
              </div>
              
              <div> 
                <label style={labelSt}>Phone Number</label>
                <input type="tel" autoComplete="off" value={formData.phone} onChange={e => setFormData({...formData,phone:e.target.value})} style={inputSt} placeholder="0240000000" />
              </div>
              
              {formData.role === 'agent' && (
                <div> 
                  <label style={labelSt}>Store Name</label>
                  <input type="text" autoComplete="off" value={formData.store_name} onChange={e => setFormData({...formData,store_name:e.target.value})} style={inputSt} placeholder="e.g. Kwame's Data Store" />
                </div>
              )}
              
              <div style={{ gridColumn:'1 / -1', marginTop:'0.5rem' }}>
                <button type="submit" style={{ padding:'0.875rem 2rem', background:'linear-gradient(135deg,#10b981,#059669)', color:'white', border:'none', borderRadius:'0.625rem', fontWeight:'700', cursor:'pointer' }}>
                  ✓ Create {formData.role==='admin'?'Admin':'Agent'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="card" style={{ background:'var(--card-bg)', borderRadius:'1rem', border:'1px solid var(--border-color)', overflow:'hidden' }}>
          <div style={{ overflowX:'auto', width:'100%' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'800px' }}>
              <thead>
                <tr style={{ background:'var(--bg-secondary)', borderBottom:'1px solid var(--border-color)' }}>
                  <th style={{ textAlign:'left', padding:'1rem', fontSize:'0.75rem', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Username</th>
                  <th style={{ textAlign:'left', padding:'1rem', fontSize:'0.75rem', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Phone</th>
                  <th style={{ textAlign:'left', padding:'1rem', fontSize:'0.75rem', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Role</th>
                  <th style={{ textAlign:'left', padding:'1rem', fontSize:'0.75rem', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Store</th>
                  <th style={{ textAlign:'left', padding:'1rem', fontSize:'0.75rem', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Orders</th>
                  <th style={{ textAlign:'left', padding:'1rem', fontSize:'0.75rem', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Sales</th>
                  <th style={{ textAlign:'left', padding:'1rem', fontSize:'0.75rem', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Joined</th>
                  <th style={{ textAlign:'right', padding:'1rem', fontSize:'0.75rem', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => {
                  if (!search.trim()) return true;
                  const query = search.trim().toLowerCase();
                  return [u.username, u.store_name, u.phone].some(val => val?.toString().toLowerCase().includes(query));
                }).length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)' }}>No users match your search</td>
                  </tr>
                ) : (
                  users.filter(u => {
                    if (!search.trim()) return true;
                    const query = search.trim().toLowerCase();
                    return [u.username, u.store_name, u.phone].some(val => val?.toString().toLowerCase().includes(query));
                  }).map(u => (
                    <tr key={u.id}
                      onClick={() => u.role === 'agent' && openAgentStats(u)}
                      style={{ borderBottom:'1px solid var(--border-color)', cursor:u.role==='agent'?'pointer':'default', transition:'background 0.15s' }}
                      onMouseEnter={e => { if (u.role==='agent') e.currentTarget.style.background='var(--bg-secondary)'; }}
                      onMouseLeave={e => e.currentTarget.style.background=''}
                    >
                      <td style={{ padding:'1rem' }}>
                        <div style={{ fontWeight:'600', color:'var(--text-primary)' }}>{u.username || '—'}</div>
                        <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>{u.email}</div>
                        {u.role === 'agent' && <div style={{ fontSize:'0.68rem', color:'var(--primary)', marginTop:'0.2rem' }}>Click to view stats →</div>}
                      </td>
                      <td style={{ padding:'1rem', fontSize:'0.875rem', color:'var(--text-primary)' }}>{u.phone || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ padding:'1rem' }}>
                        <span style={{ padding:'0.25rem 0.75rem', borderRadius:'9999px', fontSize:'0.72rem', fontWeight:'700', background:u.role==='admin'?'rgba(139,92,246,0.15)':'rgba(59,130,246,0.15)', color:u.role==='admin'?'#8b5cf6':'#3b82f6', textTransform:'uppercase' }}>{u.role}</span>
                      </td>
                      <td style={{ padding:'1rem' }}>
                        {u.store_slug ? (
                          <div onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize:'0.85rem', fontWeight:'500', color:'var(--text-primary)' }}>{u.store_name || u.store_slug}</div>
                            <a href={`/store/${u.store_slug}`} target="_blank" rel="noreferrer" style={{ fontSize:'0.73rem', color:'var(--primary)' }}>/store/{u.store_slug}</a>
                          </div>
                        ) : <span style={{ color:'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding:'1rem', fontWeight:'600', color:'var(--text-primary)' }}>{u.total_orders}</td>
                      <td style={{ padding:'1rem', fontWeight:'600', color:'var(--text-primary)' }}>GH₵ {parseFloat(u.total_sales).toFixed(2)}</td>
                      <td style={{ padding:'1rem', color:'var(--text-secondary)', fontSize:'0.82rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ padding:'1rem', textAlign:'right' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDelete(u.id, u.email)} style={{ padding:'0.375rem 0.75rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'0.375rem', color:'var(--danger)', cursor:'pointer', fontSize:'0.78rem', fontWeight:'600' }}>
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeSlide { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn     { from{opacity:0;transform:scale(0.88)}  to{opacity:1;transform:scale(1)} }
        .loading-spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
      `}</style>
    </div>
  );
};

export default Users;