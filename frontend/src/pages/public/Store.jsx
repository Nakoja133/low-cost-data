import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useFeedback } from '../../context/FeedbackContext';
import api from '../../api/axios';

const Store = () => {
  const { slug } = useParams();
  const { showError } = useFeedback();
  
  const [store,         setStore]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('buy');
  const [selectedPkg,   setSelectedPkg]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName,  setCustomerName]  = useState('');
  const [ordering,      setOrdering]      = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [showContact,   setShowContact]   = useState(false);
  const [showAbout,     setShowAbout]     = useState(false);
  const [trackPhone,    setTrackPhone]    = useState('');
  const [trackName,     setTrackName]     = useState('');
  const [trackedOrder,  setTrackedOrder]  = useState(null);
  const [trackError,    setTrackError]    = useState('');

  useEffect(() => { fetchStore(); }, [slug]);

  const fetchStore = async () => {
    try { 
      const r = await api.get(`/store/${slug}`); 
      setStore(r.data); 
    } catch { 
      setStore(null); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleOrderClick = (e) => {
    e.preventDefault();
    if (!selectedPkg) { showError('Please select a package.'); return; }
    if (!customerPhone) { showError('Please enter your phone number.'); return; }
    setShowConfirm(true);
  };

  const handleConfirmedOrder = async () => {
    setOrdering(true);
    try {
      const r = await api.post(`/store/${slug}/order`, { 
        phone: customerPhone, 
        package_id: selectedPkg, 
        customer_name: customerName 
      });
      window.location.href = r.data.payment_url;
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to create order.');
      setOrdering(false);
    }
  };

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setTrackError(''); 
    setTrackedOrder(null);
    try {
      const r = await api.get(`/store/${slug}/orders/track`, { 
        params: { phone: trackPhone, name: trackName || undefined } 
      });
      setTrackedOrder(r.data);
    } catch { 
      setTrackError('No orders found for this phone number'); 
    }
  };

  const getGB = (desc) => { 
    const m = desc?.match(/(\d+.?\d*)\s*GB/i); 
    return m ? m[1] + ' GB' : desc; 
  };

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return { greeting: 'Good morning', icon: '🌅' };
    if (h >= 12 && h < 17) return { greeting: 'Good afternoon', icon: '☀️' };
    if (h >= 17 && h < 21) return { greeting: 'Good evening', icon: '🌆' };
    return { greeting: 'Good night', icon: '🌙' };
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '2.5rem', height: '2.5rem', border: '3px solid var(--border-color)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p>Loading store...</p>
      </div>
    </div>
  );

  if (!store) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Store Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>This store doesn't exist or has been deactivated.</p>
        <button onClick={() => window.history.back()} style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: '700' }}>
          ← Go Back
        </button>
      </div>
    </div>
  );

  const grouped = store.packages.reduce((acc, p) => { 
    if (!acc[p.network]) acc[p.network] = []; 
    acc[p.network].push(p); 
    return acc; 
  }, {});

  const pkg = store.packages.find(p => p.id === selectedPkg);
  const bundlePrice = pkg ? parseFloat(pkg.price) : 0;
  const { greeting, icon } = getTimeGreeting();
  const storeName = store.agent.store_name || `${store.agent.username || store.agent.email?.split('@')[0]}'s Data Store`;
  const whatsappUrl = store.agent.whatsapp_number 
    ? `https://wa.me/${store.agent.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(storeName)}!%20I%20want%20to%20buy%20a%20data%20bundle.` 
    : null;
  const callUrl = store.agent.phone ? `tel:${store.agent.phone}` : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '3rem' }}>
      
      {/* Confirm Modal */}
      {showConfirm && pkg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '1.25rem', maxWidth: '380px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '1.25rem 1.5rem', color: 'white' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🧾</div>
              <h3 style={{ fontWeight: '800', fontSize: '1.1rem', margin: 0 }}>Order Summary</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {[
                ['Package', getGB(pkg.description)],
                ['Network', pkg.network],
                ['Phone', customerPhone],
                ['Amount', `GH₵ ${bundlePrice.toFixed(2)}`]
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: '600' }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.625rem', fontSize: '0.8rem', color: 'var(--warning)', fontWeight: '600', textAlign: 'center' }}>
                ⚠️ Amount may change due to charges
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '0.875rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Cancel
                </button>
                <button onClick={handleConfirmedOrder} disabled={ordering} style={{ flex: 2, padding: '0.875rem', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: '0.625rem', color: 'white', fontWeight: '800', cursor: ordering ? 'not-allowed' : 'pointer', opacity: ordering ? 0.7 : 1 }}>
                  {ordering ? 'Processing...' : '💳 Proceed to Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '1.25rem', maxWidth: '360px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '1.25rem 1.5rem', color: 'white' }}>
              <p style={{ fontWeight: '800', fontSize: '1rem', margin: 0 }}>💬 Have a Question?</p>
              <p style={{ opacity: 0.85, fontSize: '0.82rem', margin: '0.25rem 0 0' }}>Choose how to reach the seller</p>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowContact(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '0.875rem', color: '#25d366', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>💬</span>
                  <div>
                    <div>Chat on WhatsApp</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '400', opacity: 0.8 }}>Opens WhatsApp chat</div>
                  </div>
                </a>
              )}
              {callUrl && (
                <a href={callUrl} onClick={() => setShowContact(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '0.875rem', color: '#3b82f6', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📞</span>
                  <div>
                    <div>Call {store.agent.phone}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '400', opacity: 0.8 }}>Dials seller's number</div>
                  </div>
                </a>
              )}
              {!whatsappUrl && !callUrl && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No contact info available</p>}
              <button onClick={() => setShowContact(false)} style={{ padding: '0.875rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '1.25rem', maxWidth: '360px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '1.25rem 1.5rem', color: 'white' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🏪</div>
              <h3 style={{ fontWeight: '800', fontSize: '1.1rem', margin: 0 }}>{storeName}</h3>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                ['Store Name', storeName],
                ['Email', store.agent.email],
                ...(store.agent.phone ? [['Phone', store.agent.phone]] : [])
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{k}</span>
                  <span style={{ fontWeight: '600', fontSize: '0.875rem', maxWidth: '200px', textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
                </div>
              ))}
              <button onClick={() => setShowAbout(false)} style={{ marginTop: '0.5rem', padding: '0.875rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Header ─────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)', padding: '1.5rem 1.25rem 1.75rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '180px', height: '180px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

        {/* Store name + About */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ opacity: 0.72, fontSize: '0.68rem', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Data Store</p>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', lineHeight: 1.2, margin: 0 }}>{storeName}</h1>
          </div>
          <button onClick={() => setShowAbout(true)} style={{ padding: '0.45rem 0.875rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '9999px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem', flexShrink: 0 }}>
            ℹ️ About
          </button>
        </div>

        {/* Greeting + Contact Seller */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '0.875rem', padding: '0.875rem 1rem', flex: 1, minWidth: '200px', backdropFilter: 'blur(10px)' }}>
            <p style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 0.15rem' }}>{icon} {greeting}, Customer!</p>
            <p style={{ opacity: 0.88, fontSize: '0.78rem', margin: 0 }}>Buy affordable data bundles</p>
          </div>
          <button onClick={() => setShowContact(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.25rem', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '0.875rem', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', flexShrink: 0 }}>
            💬 Contact Seller
          </button>
        </div>

        {/* Feature Badges */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.625rem' }}>
          {[
            { icon: '🔒', title: '100% Secured', sub: 'Safe & encrypted' },
            { icon: '🕐', title: '5min – 1hr Delivery', sub: 'Auto after payment' },
            { icon: '📶', title: 'All Networks', sub: 'MTN, Telecel & more' },
            { icon: '💬', title: '24/7 Available', sub: 'Always here for you' },
          ].map(b => (
            <div key={b.title} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '0.75rem', padding: '0.875rem 1rem', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{b.icon}</div>
              <div style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.1rem' }}>{b.title}</div>
              <div style={{ opacity: 0.8, fontSize: '0.7rem' }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100 }}>
        {[{ id: 'buy', label: '🛒 Buy Bundle' }, { id: 'track', label: '📦 Track Order' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '1rem', background: activeTab === t.id ? 'var(--primary)' : 'transparent', color: activeTab === t.id ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '1.5rem 1rem', maxWidth: '760px', margin: '0 auto' }}>
        {activeTab === 'buy' && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>Select a Package</h2>
            {Object.entries(grouped).map(([network, pkgs]) => (
              <div key={network} style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {network === 'MTN' ? '📱' : network === 'Telecel' ? '📡' : '📶'} {network}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '0.75rem' }}>
                  {pkgs.map(p => {
                    const sel = selectedPkg === p.id;
                    return (
                      <button key={p.id} onClick={() => setSelectedPkg(p.id)}
                        style={{ padding: '1.125rem 0.875rem', background: sel ? 'var(--primary)' : 'var(--bg-secondary)', border: `2px solid ${sel ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '0.875rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', color: sel ? 'white' : 'var(--text-primary)', transform: sel ? 'scale(1.04)' : 'scale(1)', boxShadow: sel ? '0 4px 15px rgba(99,102,241,0.35)' : 'none' }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}}
                      >
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.25rem' }}>{getGB(p.description)}</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '700', color: sel ? 'rgba(255,255,255,0.9)' : 'var(--primary)' }}>GH₵ {parseFloat(p.price).toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1.25rem' }}>📝 Your Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Your Name (Optional)</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Kwame Mensah" className="input" style={{ width: '100%', padding: '0.875rem 1rem', border: '1px solid var(--border-color)', borderRadius: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Phone to Receive Data <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="0549722133" className="input" required style={{ width: '100%', padding: '0.875rem 1rem', border: '1px solid var(--border-color)', borderRadius: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                {pkg && (
                  <div style={{ padding: '0.875rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected:</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{getGB(pkg.description)} — GH₵ {parseFloat(pkg.price).toFixed(2)}</span>
                  </div>
                )}
                <button onClick={handleOrderClick} disabled={!selectedPkg || !customerPhone}
                  style={{ padding: '1rem', background: !selectedPkg || !customerPhone ? 'var(--bg-tertiary)' : 'linear-gradient(135deg,#10b981,#059669)', color: !selectedPkg || !customerPhone ? 'var(--text-muted)' : 'white', border: 'none', borderRadius: '0.625rem', fontWeight: '800', fontSize: '1rem', cursor: !selectedPkg || !customerPhone ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {!selectedPkg || !customerPhone ? 'Select package & enter phone' : '🛒 Order'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'track' && (
          <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>📦 Track Your Order</h2>
            <form onSubmit={handleTrackOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Phone Number *</label>
                <input type="tel" value={trackPhone} onChange={e => setTrackPhone(e.target.value)} placeholder="0549722133" className="input" required style={{ width: '100%', padding: '0.875rem 1rem', border: '1px solid var(--border-color)', borderRadius: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Name (Optional)</label>
                <input type="text" value={trackName} onChange={e => setTrackName(e.target.value)} placeholder="Kwame Mensah" className="input" style={{ width: '100%', padding: '0.875rem 1rem', border: '1px solid var(--border-color)', borderRadius: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <button type="submit" style={{ padding: '1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.625rem', fontWeight: '800', cursor: 'pointer' }}>🔍 Track Order</button>
            </form>
            {trackError && <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.625rem', color: 'var(--danger)', textAlign: 'center' }}>{trackError}</div>}
            {trackedOrder && (
              <div style={{ marginTop: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '0.82rem' }}>{trackedOrder.reference}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{new Date(trackedOrder.created_at).toLocaleString()}</div>
                  </div>
                  <span style={{ padding: '0.3rem 0.875rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', background: trackedOrder.status === 'completed' ? 'rgba(16,185,129,0.15)' : trackedOrder.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: trackedOrder.status === 'completed' ? 'var(--success)' : trackedOrder.status === 'pending' ? 'var(--warning)' : 'var(--danger)' }}>
                    {trackedOrder.status}
                  </span>
                </div>
                <div style={{ padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    ['Package', getGB(trackedOrder.package_name)],
                    ['Phone', trackedOrder.customer_phone],
                    ...(trackedOrder.customer_name ? [['Name', trackedOrder.customer_name]] : []),
                    ['Paid', `GH₵ ${parseFloat(trackedOrder.amount_paid).toFixed(2)}`]
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{k}</span>
                      <span style={{ fontWeight: '600' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '2rem 1rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem', borderTop: '1px solid var(--border-color)', marginTop: '2rem' }}>
        <p>Powered by Low-Cost Data Bundles</p>
        <p style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>© 2026 All rights reserved</p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
};

export default Store;