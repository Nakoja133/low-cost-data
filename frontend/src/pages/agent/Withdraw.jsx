import { useState, useEffect } from 'react';
import { useNavigate }          from 'react-router-dom';
import { useAuth }              from '../../context/AuthContext';
import api                      from '../../api/axios';
import MobileMenu, { verifyLockPassword } from '../../components/MobileMenu';

const CHARGE_PCT = 0.009; // 0.9%

const Withdraw = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [walletData,    setWalletData]    = useState({ balance: 0, available: 0, pending_withdrawals: 0 });
  const [minAmount,     setMinAmount]     = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [step,          setStep]          = useState('check'); // check|confirm_charge|choose|auto|manual|fallback
  const [amount,        setAmount]        = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [message,       setMessage]       = useState({ type: '', text: '' });
  const [chargeInfo,    setChargeInfo]    = useState({ charge: 0, net: 0 });

  // Lock verification
  const [lockEnabled,   setLockEnabled]   = useState(false);
  const [lockVerified,  setLockVerified]  = useState(false);
  const [lockPassword,  setLockPassword]  = useState('');
  const [showLockModal, setShowLockModal] = useState(false);

  // Auto fields
  const [acctNumber, setAcctNumber] = useState('');
  const [bankName,   setBankName]   = useState('MTN Mobile Money');
  const [acctName,   setAcctName]   = useState('');

  // Manual fields
  const [manualName,  setManualName]  = useState('');
  const [manualMomo,  setManualMomo]  = useState('');
  const [manualEmail, setManualEmail] = useState(user?.email || '');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [wRes, sRes, lRes] = await Promise.allSettled([
        api.get('/agent/wallet'),
        api.get('/agent/settings').catch(() => ({ data: { settings: {} } })),
        api.get('/lock-activities/status').catch(() => ({ data: { is_enabled: false } })),
      ]);
      if (wRes.status === 'fulfilled') setWalletData(wRes.value.data);
      setMinAmount(parseFloat(sRes.status === 'fulfilled' ? sRes.value.data?.settings?.min_withdrawal_amount : '1') || 1);
      setLockEnabled(lRes.status === 'fulfilled' ? lRes.value.data?.is_enabled : false);
      setLockVerified(false); // Reset verification on page load
    } finally { setLoading(false); }
  };

  const available = parseFloat(walletData.available || 0);
  const requested = parseFloat(amount) || 0;

  const calcCharge = (amt) => {
    const charge = parseFloat((amt * CHARGE_PCT).toFixed(2));
    const net    = parseFloat((amt - charge).toFixed(2));
    return { charge, net };
  };

  // Step 1: Validate amount → check lock → show charge confirmation
  const handleCheckAmount = () => {
    setMessage({ type: '', text: '' });
    if (requested > available) { setMessage({ type: 'error', text: `Insufficient balance. Available: GH₵ ${available.toFixed(2)}` }); return; }
    if (requested < minAmount) { setMessage({ type: 'error', text: `Minimum withdrawal is GH₵ ${minAmount.toFixed(2)}` }); return; }

    // Check if lock is enabled and not verified
    if (lockEnabled && !lockVerified) {
      setShowLockModal(true);
      return;
    }

    const info = calcCharge(requested);
    setChargeInfo(info);
    setStep('confirm_charge'); // ✅ show charge warning modal
  };

  // Auto withdrawal
  const handleAutoWithdraw = async () => {
    if (!acctNumber || !acctName) { setMessage({ type: 'error', text: 'Please fill in all fields' }); return; }
    setSubmitting(true); setMessage({ type: '', text: '' });
    try {
      const r = await api.post('/withdrawals', { amount: requested, account_number: acctNumber, bank_name: bankName, account_name: acctName });
      setMessage({ type: 'success', text: r.data.message });
      setStep('check'); setAmount(''); setAcctNumber(''); setAcctName('');
      fetchData();
    } catch (err) {
      const d = err.response?.data;
      if (d?.fallback) setStep('fallback');
      else setMessage({ type: 'error', text: d?.error || 'Withdrawal failed' });
    } finally { setSubmitting(false); }
  };

  // Manual withdrawal
  const handleManualWithdraw = async () => {
    if (!manualName || !manualMomo || !manualEmail) { setMessage({ type: 'error', text: 'Please fill in all fields' }); return; }
    setSubmitting(true); setMessage({ type: '', text: '' });
    try {
      const r = await api.post('/withdrawals/manual', { amount: requested, account_name: manualName, momo_number: manualMomo, agent_email: manualEmail });
      setMessage({ type: 'success', text: r.data.message });
      setStep('check'); setAmount(''); setManualName(''); setManualMomo('');
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit' });
    } finally { setSubmitting(false); }
  };

  // ── Lock verification ───────────────────────────────────
  const handleLockVerification = async () => {
    if (!lockPassword) {
      setMessage({ type: 'error', text: 'Please enter your lock password' });
      return;
    }

    const result = await verifyLockPassword(lockPassword);
    if (result.success) {
      setLockVerified(true);
      setShowLockModal(false);
      setLockPassword('');
      // Now proceed with charge confirmation
      const info = calcCharge(requested);
      setChargeInfo(info);
      setStep('confirm_charge');
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  const inputStyle = { width: '100%', padding: '0.875rem 1rem', border: '1px solid var(--border-color)', borderRadius: '0.625rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' };
  const labelStyle = { display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-secondary)' };

  if (loading) return <div className="dashboard-container"><div className="loading">Loading...</div></div>;

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/agent/withdraw" />

      {/* ── Charge Warning Modal ──────────────────────────────── */}
      {step === 'confirm_charge' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '1.25rem', maxWidth: '380px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', padding: '1.25rem 1.5rem', color: 'white' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>⚠️</div>
              <h3 style={{ fontWeight: '800', fontSize: '1.05rem', margin: 0 }}>Withdrawal Charge Notice</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: '1.65' }}>
                A <strong>0.9% service charge</strong> applies to your withdrawal. The amount you receive will be slightly less than what you requested.
              </p>
              {[
                ['Requested',      `GH₵ ${requested.toFixed(2)}`],
                ['Service charge (0.9%)', `− GH₵ ${chargeInfo.charge.toFixed(2)}`],
                ['You will receive', `GH₵ ${chargeInfo.net.toFixed(2)}`],
              ].map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: i === 2 ? '800' : '600', fontSize: i === 2 ? '1rem' : '0.9rem', color: i === 2 ? 'var(--success)' : 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button onClick={() => setStep('check')} style={{ flex: 1, padding: '0.875rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Cancel
                </button>
                <button onClick={() => setStep('choose')} style={{ flex: 2, padding: '0.875rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '0.625rem', color: 'white', fontWeight: '800', cursor: 'pointer' }}>
                  Proceed to Withdrawal →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="main-content" style={{ paddingTop: '1rem', maxWidth: '560px' }}>

        {/* Balance cards */}
        <div style={{ display: 'grid', gridTemplateColumns: walletData.pending_withdrawals > 0 ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '1rem', padding: '1.5rem', color: 'white', textAlign: 'center' }}>
            <p style={{ opacity: 0.88, fontSize: '0.82rem', marginBottom: '0.25rem' }}>Total Balance</p>
            <p style={{ fontSize: '2.25rem', fontWeight: '800', lineHeight: 1 }}>GH₵ {parseFloat(walletData.balance).toFixed(2)}</p>
          </div>
          {walletData.pending_withdrawals > 0 && (
            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '1rem', padding: '1.5rem', color: 'white', textAlign: 'center' }}>
              <p style={{ opacity: 0.88, fontSize: '0.82rem', marginBottom: '0.25rem' }}>Available</p>
              <p style={{ fontSize: '2.25rem', fontWeight: '800', lineHeight: 1 }}>GH₵ {available.toFixed(2)}</p>
              <p style={{ opacity: 0.8, fontSize: '0.72rem', marginTop: '0.3rem' }}>GH₵ {parseFloat(walletData.pending_withdrawals).toFixed(2)} pending</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem' }}>💵 Withdraw Earnings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Min: GH₵ {minAmount.toFixed(2)} · A 0.9% service charge applies
          </p>

          {message.text && (
            <div style={{ padding: '0.875rem 1rem', borderRadius: '0.625rem', marginBottom: '1.25rem', background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: '500' }}>
              {message.text}
            </div>
          )}

          {/* No balance state */}
          {available <= 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.875rem' }}>💸</div>
              <h3 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>{walletData.balance > 0 ? 'Funds Locked' : 'No Balance'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                {walletData.balance > 0
                  ? `GH₵ ${parseFloat(walletData.balance).toFixed(2)} is tied up in a pending withdrawal.`
                  : `You need at least GH₵ ${minAmount.toFixed(2)} to withdraw. Keep selling!`}
              </p>
              <button onClick={() => navigate('/agent/dashboard')} style={{ padding: '0.875rem 2rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.625rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}>
                ← Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* STEP: Enter amount */}
              {step === 'check' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                  <div>
                    <label style={labelStyle}>Amount (GH₵)</label>
                    <input type="number" step="0.01" min={minAmount} max={available} value={amount}
                      onChange={e => setAmount(e.target.value)} style={inputStyle}
                      placeholder={`Min GH₵ ${minAmount.toFixed(2)} · Max GH₵ ${available.toFixed(2)}`} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Min: GH₵ {minAmount.toFixed(2)} · Max: GH₵ {available.toFixed(2)} · 0.9% charge applies
                    </p>
                  </div>
                  <button onClick={handleCheckAmount} style={{ padding: '1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
                    Continue →
                  </button>
                </div>
              )}

              {/* STEP: Choose method — shown after charge confirmed */}
              {step === 'choose' && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ padding: '0.875rem 1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.625rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>You will receive</span>
                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--success)' }}>GH₵ {chargeInfo.net.toFixed(2)}</span>
                  </div>
                  <p style={{ fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>How would you like to withdraw?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    {[
                      { key: 'auto',   icon: '⚡', label: 'Automatic', sub: 'Instant via Paystack', color: '#10b981', border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.08)' },
                      { key: 'manual', icon: '📋', label: 'Manual',    sub: 'Admin processes it',  color: '#6366f1', border: 'rgba(99,102,241,0.3)', bg: 'rgba(99,102,241,0.08)' },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => setStep(opt.key)}
                        style={{ padding: '1.5rem 1rem', background: opt.bg, border: `2px solid ${opt.border}`, borderRadius: '1rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = opt.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = opt.border; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{opt.icon}</div>
                        <div style={{ fontWeight: '700', color: opt.color, marginBottom: '0.25rem' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStep('check')} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}>← Change Amount</button>
                </div>
              )}

              {/* Auto form */}
              {step === 'auto' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ padding: '0.875rem 1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.625rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You receive</span>
                    <span style={{ fontWeight: '800', color: 'var(--success)' }}>GH₵ {chargeInfo.net.toFixed(2)}</span>
                  </div>
                  <div>
                    <label style={labelStyle}>Payment Method</label>
                    <select value={bankName} onChange={e => setBankName(e.target.value)} style={inputStyle}>
                      <option>MTN Mobile Money</option>
                      <option>Vodafone Cash</option>
                      <option>AirtelTigo Money</option>
                    </select>
                    <p style={{ fontSize: '0.72rem', color: 'var(--warning)', marginTop: '0.25rem' }}>⚠️ Only MoMo accepted</p>
                  </div>
                  <div>
                    <label style={labelStyle}>MoMo Number *</label>
                    <input type="tel" value={acctNumber} onChange={e => setAcctNumber(e.target.value)} style={inputStyle} placeholder="0549722133" />
                  </div>
                  <div>
                    <label style={labelStyle}>Account Name *</label>
                    <input type="text" value={acctName} onChange={e => setAcctName(e.target.value)} style={inputStyle} placeholder="Name on MoMo account" />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setStep('choose')} style={{ flex: 1, padding: '0.875rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
                    <button onClick={handleAutoWithdraw} disabled={submitting} style={{ flex: 2, padding: '0.875rem', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: '0.625rem', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? 'Processing...' : '⚡ Send Now'}
                    </button>
                  </div>
                </div>
              )}

              {/* Manual form */}
              {step === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ padding: '0.875rem 1rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.625rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You receive</span>
                    <span style={{ fontWeight: '800', color: 'var(--primary)' }}>GH₵ {chargeInfo.net.toFixed(2)}</span>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '0.5rem', fontSize: '0.82rem', color: 'var(--warning)' }}>
                    ⚠️ Only MoMo accepted. Admin processes within 24 hours.
                  </div>
                  {[
                    { lbl: 'Your Email *', val: manualEmail, set: setManualEmail, type: 'email', ph: 'you@example.com' },
                    { lbl: 'Name on MoMo *', val: manualName, set: setManualName, type: 'text',  ph: 'Full name' },
                    { lbl: 'MoMo Number *',  val: manualMomo, set: setManualMomo, type: 'tel',   ph: '0549722133' },
                  ].map(f => (
                    <div key={f.lbl}>
                      <label style={labelStyle}>{f.lbl}</label>
                      <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} style={inputStyle} placeholder={f.ph} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setStep('choose')} style={{ flex: 1, padding: '0.875rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
                    <button onClick={handleManualWithdraw} disabled={submitting} style={{ flex: 2, padding: '0.875rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.625rem', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? 'Submitting...' : '📋 Submit Request'}
                    </button>
                  </div>
                </div>
              )}

              {/* Paystack fallback */}
              {step === 'fallback' && (
                <div style={{ textAlign: 'center', padding: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.875rem' }}>⚠️</div>
                  <h3 style={{ fontWeight: '700', color: 'var(--danger)', marginBottom: '0.5rem' }}>Withdrawal Failed</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    Automatic transfer failed. Please use Manual Withdrawal or try again later.<br />
                    <strong>Only MoMo accepted for manual withdrawal.</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button onClick={() => setStep('manual')} style={{ padding: '0.875rem 1.5rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.625rem', fontWeight: '700', cursor: 'pointer' }}>📋 Manual Withdrawal</button>
                    <button onClick={() => { setStep('check'); setMessage({ type: '', text: '' }); }} style={{ padding: '0.875rem 1.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Lock Verification Modal */}
      {showLockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '1.25rem', maxWidth: '380px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', padding: '1.25rem 1.5rem', color: 'white' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🔒</div>
              <h3 style={{ fontWeight: '800', fontSize: '1.05rem', margin: 0 }}>Lock Verification Required</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: '1.65' }}>
                Your lock activities protection is enabled. Please enter your lock password to proceed with this withdrawal.
              </p>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Lock Password
                </label>
                <input
                  type="password"
                  value={lockPassword}
                  onChange={e => setLockPassword(e.target.value)}
                  className="input"
                  placeholder="Enter your lock password"
                  autoFocus
                />
              </div>
              {message.type === 'error' && (
                <div style={{ padding: '0.875rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontWeight: '600', fontSize: '0.875rem' }}>
                  {message.text}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { setShowLockModal(false); setLockPassword(''); setMessage({ type: '', text: '' }); }} style={{ padding: '0.875rem 1.25rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Cancel
                </button>
                <button onClick={handleLockVerification} disabled={!lockPassword} style={{ flex: 1, padding: '0.875rem', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', border: 'none', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: '700', opacity: !lockPassword ? 0.6 : 1 }}>
                  🔓 Verify & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn  { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
};

export default Withdraw;
