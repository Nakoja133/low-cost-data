import { useState, useEffect } from 'react';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'];
const NET_COLORS = { MTN: '#fbbf24', Telecel: '#ef4444', AirtelTigo: '#3b82f6' };
const NET_ICONS = { MTN: '📱', Telecel: '📡', AirtelTigo: '📶' };

const SetPrices = () => {
  const [packages, setPackages] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [mode, setMode] = useState('manual'); // 'manual' | 'markup'
  
  // Bulk markup controls
  const [bulkScope, setBulkScope] = useState('all');
  const [bulkMarkup, setBulkMarkup] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [pkgRes, priceRes] = await Promise.all([
        api.get('/packages'),
        api.get('/agent/prices'),
      ]);
      const pkgs = pkgRes.data.data || [];
      const agentPrices = priceRes.data.data || [];
      
      const map = {};
      pkgs.forEach(p => {
        const existing = agentPrices.find(ap => ap.package_id === p.id);
        map[p.id] = {
          selling_price: existing ? parseFloat(existing.selling_price).toFixed(2) : parseFloat(p.base_price).toFixed(2),
          markup_pct: existing ? parseFloat(existing.markup_percentage || 0).toFixed(1) : '0',
          base_price: parseFloat(p.base_price),
        };
      });
      setPackages(pkgs);
      setPrices(map);
    } catch { setMessage({ type: 'error', text: 'Failed to load packages' }); }
    finally { setLoading(false); }
  };

  // ── Manual price change — prevent below base ──────────────────
  const handlePriceChange = (pkgId, val) => {
    const base = prices[pkgId]?.base_price || 0;
    const selling = parseFloat(val) || 0;
    const pct = base > 0 ? (((selling - base) / base) * 100).toFixed(1) : '0';
    setPrices(prev => ({ ...prev, [pkgId]: { ...prev[pkgId], selling_price: val, markup_pct: pct } }));
  };

  // ── Per-package markup change — prevent negative ───────────────
  const handleMarkupChange = (pkgId, val) => {
    const raw = parseFloat(val);
    const pct = isNaN(raw) ? '' : Math.max(0, raw).toString();
    const base = prices[pkgId]?.base_price || 0;
    const sell = (base * (1 + (parseFloat(pct) || 0) / 100)).toFixed(2);
    setPrices(prev => ({ ...prev, [pkgId]: { ...prev[pkgId], markup_pct: pct, selling_price: sell } }));
  };

  // ── Apply bulk markup ─────────────────────────────────────────
  const applyBulkMarkup = () => {
    const pct = parseFloat(bulkMarkup);
    if (isNaN(pct) || pct < 0) { setMessage({ type: 'error', text: 'Enter a valid markup % (≥ 0)' }); return; }
    
    const targets = bulkScope === 'all'
      ? packages
      : packages.filter(p => p.network === bulkScope);

    const updated = { ...prices };
    targets.forEach(p => {
      const base = updated[p.id]?.base_price || parseFloat(p.base_price);
      const sell = (base * (1 + pct / 100)).toFixed(2);
      updated[p.id] = { ...updated[p.id], markup_pct: pct.toString(), selling_price: sell };
    });
    setPrices(updated);
    setMessage({ type: 'success', text: `${pct}% markup applied to ${bulkScope === 'all' ? 'all networks' : bulkScope}` });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    // Validate: no selling price below base price
    for (const pkg of packages) {
      const p = prices[pkg.id];
      const sell = parseFloat(p?.selling_price);
      const base = parseFloat(pkg.base_price);
      if (sell < base) {
        setMessage({ type: 'error', text: `${pkg.description} price (GH₵ ${sell.toFixed(2)}) is below the base price (GH₵ ${base.toFixed(2)}). Please correct it.` });
        return;
      }
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = packages.map(p => ({
        package_id: p.id,
        selling_price: parseFloat(prices[p.id]?.selling_price) || parseFloat(p.base_price),
        markup_percentage: parseFloat(prices[p.id]?.markup_pct) || 0,
      }));
      await api.post('/agent/prices/bulk', { prices: payload });
      setMessage({ type: 'success', text: '✅ Prices saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save prices' });
    } finally { setSaving(false); }
  };

  const grouped = {};
  NETWORKS.forEach(n => { grouped[n] = packages.filter(p => p.network === n); });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/agent/set-prices" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
          borderRadius: '1rem', 
          padding: '1.5rem', 
          marginBottom: '1.5rem', 
          color: 'white',
          boxShadow: '0 8px 25px rgba(99,102,241,0.28)' 
        }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>💰</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.2rem', margin: 0 }}>Set Bundle Prices</h2>
          <p style={{ opacity: 0.9, fontSize: '0.875rem', margin: 0 }}>Set your selling price above the base price to earn profit on each sale.</p>
        </div>

        {/* Mode Toggle */}
        <div className="card" style={{ marginBottom: '1.25rem', background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: '600', margin: '0 0 0.75rem' }}>Pricing Method</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {[['manual', '✏️ Manual Price'], ['markup', '📊 Markup %']].map(([val, lbl]) => (
              <button key={val} onClick={() => setMode(val)} style={{ 
                padding: '0.625rem 1.25rem', 
                border: 'none', 
                borderRadius: '0.5rem', 
                cursor: 'pointer', 
                fontWeight: '600', 
                fontSize: '0.875rem', 
                background: mode === val ? 'var(--primary)' : 'var(--bg-tertiary)', 
                color: mode === val ? 'white' : 'var(--text-primary)', 
                transition: 'all 0.2s' 
              }}>
                {lbl}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            {mode === 'manual' ? 'Enter your exact selling price per bundle. Minimum = base price.' : 'Set a % markup — auto-calculates selling price. Minimum = 0%.'}
          </p>

          {/* ✅ Bulk markup controls — visible only in markup mode */}
          {mode === 'markup' && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', animation: 'fadeSlide 0.2s ease' }}>
              <p style={{ fontWeight: '700', fontSize: '0.875rem', marginBottom: '0.875rem', marginTop: 0 }}>🚀 Apply Bulk Markup</p>
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                {['all', ...NETWORKS].map(scope => (
                  <button key={scope} onClick={() => setBulkScope(scope)} style={{ 
                    padding: '0.45rem 0.875rem', 
                    border: 'none', 
                    borderRadius: '9999px', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontSize: '0.8rem', 
                    background: bulkScope === scope ? (scope === 'all' ? 'var(--primary)' : NET_COLORS[scope]) : 'var(--bg-tertiary)', 
                    color: bulkScope === scope ? 'white' : 'var(--text-primary)', 
                    transition: 'all 0.2s' 
                  }}>
                    {scope === 'all' ? '🌐 All Networks' : `${NET_ICONS[scope]} ${scope}`}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="number" step="0.5" min="0" value={bulkMarkup} onChange={e => setBulkMarkup(e.target.value)} placeholder="e.g. 10" style={{ 
                  flex: 1, 
                  minWidth: '100px',
                  padding: '0.625rem 0.875rem', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '0.5rem', 
                  background: 'var(--bg-primary)', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.95rem' 
                }} />
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>%</span>
                <button onClick={applyBulkMarkup} style={{ 
                  padding: '0.625rem 1.25rem', 
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  cursor: 'pointer', 
                  fontWeight: '700', 
                  fontSize: '0.875rem', 
                  whiteSpace: 'nowrap' 
                }}>
                  Apply to {bulkScope === 'all' ? 'All' : bulkScope}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {message.text && (
          <div style={{ 
            padding: '0.875rem 1rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1.25rem', 
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, 
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)', 
            fontWeight: '500' 
          }}>
            {message.text}
          </div>
        )}

        {/* Package groups */}
        {NETWORKS.map(net => {
          const pkgs = grouped[net] || [];
          if (!pkgs.length) return null;
          return (
            <div key={net} className="card" style={{ marginBottom: '1.25rem', borderLeft: `4px solid ${NET_COLORS[net]}`, background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: NET_COLORS[net], marginBottom: '1rem', padding: '1.5rem 1.5rem 0', margin: 0 }}>
                {NET_ICONS[net]} {net}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem' }}>
                {pkgs.map(pkg => {
                  const p = prices[pkg.id] || { selling_price: pkg.base_price, markup_pct: '0', base_price: parseFloat(pkg.base_price) };
                  const sell = parseFloat(p.selling_price) || 0;
                  const base = parseFloat(pkg.base_price);
                  const profit = (sell - base).toFixed(2);
                  const isValid = sell >= base;

                  return (
                    <div key={pkg.id} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr auto auto auto', 
                      gap: '0.75rem', 
                      alignItems: 'center', 
                      padding: '0.875rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '0.75rem', 
                      border: `1px solid ${isValid ? 'var(--border-color)' : 'rgba(239,68,68,0.4)'}` 
                    }}>
                      {/* Package info */}
                      <div style={{ minWidth: '120px' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{pkg.description}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Base: GH₵ {base.toFixed(2)}</div>
                        {!isValid && <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: '600', marginTop: '0.1rem' }}>⚠️ Below base price</div>}
                      </div>

                      {/* Markup input (markup mode only) */}
                      {mode === 'markup' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input type="number" step="0.5" min="0" value={p.markup_pct}
                            onChange={e => handleMarkupChange(pkg.id, e.target.value)}
                            style={{ width: '68px', padding: '0.45rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.375rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.88rem', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>%</span>
                        </div>
                      )}

                      {/* Selling price */}
                      <div style={{ minWidth: '80px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                          {mode === 'markup' ? 'Selling price' : 'Your price (GH₵)'}
                        </div>
                        {mode === 'markup' ? (
                          <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isValid ? 'var(--success)' : 'var(--danger)' }}>
                            GH₵ {sell.toFixed(2)}
                          </span>
                        ) : (
                          <input type="number" step="0.01" min={base} value={p.selling_price}
                            onChange={e => handlePriceChange(pkg.id, e.target.value)}
                            style={{ width: '90px', padding: '0.45rem 0.5rem', border: `1px solid ${isValid ? 'var(--border-color)' : 'rgba(239,68,68,0.5)'}`, borderRadius: '0.375rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.88rem', textAlign: 'center' }}
                          />
                        )}
                      </div>

                      {/* Profit badge */}
                      <div style={{ 
                        padding: '0.35rem 0.625rem', 
                        borderRadius: '0.375rem', 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        background: parseFloat(profit) > 0 ? 'rgba(16,185,129,0.15)' : 'var(--bg-tertiary)', 
                        color: parseFloat(profit) > 0 ? 'var(--success)' : 'var(--text-muted)', 
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}>
                        +GH₵ {parseFloat(profit) >= 0 ? parseFloat(profit).toFixed(2) : '0.00'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Save */}
        <button onClick={handleSave} disabled={saving} style={{ 
          width: '100%', 
          padding: '1rem', 
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
          color: 'white', 
          border: 'none', 
          borderRadius: '0.75rem', 
          fontWeight: '700', 
          fontSize: '1rem', 
          cursor: saving ? 'not-allowed' : 'pointer', 
          opacity: saving ? 0.7 : 1, 
          transition: 'all 0.2s', 
          boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
          marginTop: '0.5rem'
        }}>
          {saving ? 'Saving...' : '💾 Save All Prices'}
        </button>
      </main>

      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .main-content { padding-top: 1rem; }
        @media (max-width: 767px) { .main-content { padding-top: 0.75rem; padding-bottom: 1.5rem; } }
        .loading-spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SetPrices;