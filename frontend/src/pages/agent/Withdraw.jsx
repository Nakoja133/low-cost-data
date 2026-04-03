import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const Withdraw = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('MTN Mobile Money');
  const [accountName, setAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const response = await api.get('/agent/wallet');
      setWalletBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    if (!amount || parseFloat(amount) < 1) {
      setMessage({ type: 'error', text: 'Minimum withdrawal is GH₵ 1' });
      return;
    }
    
    if (parseFloat(amount) > walletBalance) {
      setMessage({ 
        type: 'error', 
        text: `Insufficient balance. You have GH₵ ${walletBalance.toFixed(2)}. Please withdraw an amount less than or equal to your balance.` 
      });
      return;
    }
    
    if (!accountNumber || !accountName) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/withdrawals', {
        amount: parseFloat(amount),
        account_number: accountNumber,
        bank_name: bankName,
        account_name: accountName,
      });

      setMessage({ 
        type: 'success', 
        text: `Withdrawal request submitted! Reference: ${response.data.withdrawal?.reference || 'N/A'}` 
      });
      
      setAmount('');
      setAccountNumber('');
      setAccountName('');
      fetchWalletBalance();
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to submit withdrawal' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/agent/withdraw" />
      
      <main className="main-content" style={{paddingTop: '1rem'}}>
        <div className="card">
          <h2 style={{marginBottom: '0.5rem'}}>💵 Request Withdrawal</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem'}}>
            Withdraw your earnings to Mobile Money or Bank
          </p>
          
          {/* Balance Card */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            color: 'white',
            textAlign: 'center',
          }}>
            <p style={{fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem'}}>Available Balance</p>
            <p style={{fontSize: '2.5rem', fontWeight: '700'}}>GH₵ {walletBalance.toFixed(2)}</p>
          </div>

          {message.text && (
            <div style={{
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {message.text}
            </div>
          )}
          
          {walletBalance <= 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              borderRadius: '0.75rem',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>💸</div>
              <h3 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>No Balance Available</h3>
              <p style={{color: 'var(--text-secondary)'}}>
                You need to have at least GH₵ 1 in your wallet to make a withdrawal.
              </p>
              <button
                onClick={() => window.location.href = '/agent/dashboard'}
                className="btn-primary"
                style={{marginTop: '1rem'}}
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  Amount (GH₵)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={walletBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input"
                  placeholder={`Enter amount (Min: GH₵ 1, Max: GH₵ ${walletBalance.toFixed(2)})`}
                  required
                />
                <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                  Minimum: GH₵ 1 | Maximum: GH₵ {walletBalance.toFixed(2)}
                </p>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  Payment Method
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="input"
                >
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Vodafone Cash">Vodafone Cash</option>
                  <option value="AirtelTigo Money">AirtelTigo Money</option>
                  <option value="GCB Bank">GCB Bank</option>
                  <option value="Ecobank">Ecobank</option>
                  <option value="Stanbic Bank">Stanbic Bank</option>
                </select>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  Account Number / Phone
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="input"
                  placeholder="0549722133"
                  required
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="input"
                  placeholder="Your name as registered"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '0.5rem'}}
              >
                {submitting ? 'Submitting...' : 'Request Withdrawal'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default Withdraw;