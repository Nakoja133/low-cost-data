import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

const AgentDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [walletBalance, setWalletBalance] = useState(0);
  const [packages, setPackages] = useState([]);
  const [agentPrices, setAgentPrices] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [buyingLoading, setBuyingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sell');
  const [showPricing, setShowPricing] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(20);
  const [savingPrices, setSavingPrices] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsText, setTermsText] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeAgent();
    const interval = setInterval(fetchWalletBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeAgent = async () => {
    try {
      await checkTermsStatus();
      await fetchAgentData();
      await fetchTerms();
    } catch (err) {
      console.error('Initialization error:', err);
      setError('Failed to load dashboard. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const response = await api.get('/agent/wallet');
      const newBalance = response.data.balance || 0;
      console.log('💰 Wallet balance:', newBalance);
      setWalletBalance(newBalance);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const checkTermsStatus = async () => {
    try {
      const response = await api.get('/agent/terms-status');
      const accepted = response.data.terms_accepted;
      setTermsAccepted(accepted);
      
      if (!accepted) {
        setShowTermsModal(true);
      }
    } catch (error) {
      console.error('Error checking terms:', error);
      setTermsAccepted(false);
      setShowTermsModal(true);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/admin/terms');
      setTermsText(response.data.terms || '');
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      await api.post('/agent/accept-terms');
      setTermsAccepted(true);
      setShowTermsModal(false);
    } catch (error) {
      console.error('Failed to accept terms:', error);
      alert('Failed to accept terms. Please try again.');
    }
  };

  const handleDeclineTerms = () => {
    logout();
    alert('You must accept the terms to use this platform. You have been logged out.');
  };

  const fetchAgentData = async () => {
    try {
      await fetchWalletBalance();

      const packagesRes = await api.get('/packages');
      const packagesData = packagesRes.data.data || packagesRes.data || [];
      
      const networkOrder = { 'MTN': 1, 'Telecel': 2, 'AirtelTigo': 3 };
      const sortedPackages = packagesData.sort((a, b) => {
        if (networkOrder[a.network] !== networkOrder[b.network]) {
          return networkOrder[a.network] - networkOrder[b.network];
        }
        return parseFloat(a.base_price) - parseFloat(b.base_price);
      });
      
      setPackages(sortedPackages);

      const pricesRes = await api.get('/agent/prices');
      const pricesData = pricesRes.data.data || pricesRes.data || [];
      const pricesMap = {};
      pricesData.forEach(p => {
        pricesMap[p.package_id] = p.selling_price;
      });
      setAgentPrices(pricesMap);

      const ordersRes = await api.get('/agent/orders');
      setRecentOrders(ordersRes.data.data || ordersRes.data || []);
    } catch (error) {
      console.error('Error fetching agent ', error);
      throw error;
    }
  };

  const handleBuyData = async () => {
    if (!selectedPackage || !customerPhone) {
      alert('Please select a package and enter phone number');
      return;
    }

    const confirmOrder = window.confirm(
      '📦 Order Confirmation\n\n' +
      '⏱️ Delivery Time: 5 minutes to 1 hour\n\n' +
      'The data bundle will be delivered to the customer\'s phone number within this timeframe.\n\n' +
      'Do you want to proceed?'
    );

    if (!confirmOrder) return;

    setBuyingLoading(true);

    try {
      const selectedPkg = packages.find(p => p.id === selectedPackage);
      
      const response = await api.post('/orders', {
        phone: customerPhone,
        network: selectedPkg?.network,
        package_id: selectedPackage,
        agent_id: user.id,
        customer_name: customerName || null,
      });

      console.log('✅ Order created:', response.data);

      // Refresh wallet and orders immediately
      await fetchWalletBalance();
      await fetchAgentData();
      
      // Redirect to payment - Check for payment_url or authorization_url
      const paymentUrl = response.data.payment_url || response.data.authorization_url;
      
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        alert('Order created but payment URL not received. Please check your order history.');
      }
    } catch (error) {
      console.error('❌ Order error:', error);
      console.error('Response:', error.response?.data);
      alert('Error: ' + (error.response?.data?.error || 'Failed to create order'));
    } finally {
      setBuyingLoading(false);
    }
  };

  const copyStoreLink = () => {
    const storeLink = `${window.location.origin}/store/${user?.store_slug}`;
    navigator.clipboard.writeText(storeLink);
    alert('Store link copied to clipboard!');
  };

  const calculatePriceWithMarkup = (basePrice, markup) => {
    return (basePrice * (1 + markup / 100)).toFixed(2);
  };

  const applyMarkupToAll = () => {
    const newPrices = {};
    packages.forEach(pkg => {
      newPrices[pkg.id] = calculatePriceWithMarkup(pkg.base_price, markupPercent);
    });
    setAgentPrices(newPrices);
  };

  const saveAllPrices = async () => {
    setSavingPrices(true);
    try {
      const pricesToUpdate = Object.entries(agentPrices).map(([packageId, price]) => ({
        package_id: packageId,
        selling_price: parseFloat(price),
        markup_percentage: markupPercent,
      }));

      await api.post('/agent/prices/bulk', { prices: pricesToUpdate });
      alert('Prices updated successfully!');
      setShowPricing(false);
      setActiveTab('sell');
    } catch (error) {
      console.error('Error saving prices:', error);
      alert('Error: ' + (error.response?.data?.error || 'Failed to update prices'));
    } finally {
      setSavingPrices(false);
    }
  };

  const groupedPackages = packages.reduce((acc, pkg) => {
    if (!acc[pkg.network]) acc[pkg.network] = [];
    acc[pkg.network].push(pkg);
    return acc;
  }, {});

  const getTimeBasedGreeting = (name) => {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    let icon = '👋';
    
    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
      icon = '🌅';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
      icon = '☀️';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good evening';
      icon = '🌆';
    } else {
      greeting = 'Good night';
      icon = '🌙';
    }
    
    return `${icon} ${greeting}, ${name || 'Agent'}!`;
  };

  // Helper to get short description (e.g., "10GB")
  const getShortDescription = (description) => {
    const match = description.match(/(\d+\.?\d*\s*GB)/i);
    return match ? match[1] : description;
  };

  if (error) {
    return (
      <div className="dashboard-container">
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--danger)',
        }}>
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{marginTop: '1rem'}}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (showTermsModal && !termsAccepted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          border: '1px solid var(--border-color)',
        }}>
          <h1 style={{fontSize: '1.75rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)'}}>
            📋 Agent Terms & Conditions
          </h1>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            maxHeight: '400px',
            overflowY: 'auto',
            whiteSpace: 'pre-line',
            color: 'var(--text-primary)',
            lineHeight: '1.8',
          }}>
            {termsText || 'No terms available'}
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button
              onClick={handleAcceptTerms}
              className="btn-primary"
              style={{flex: 1, padding: '1rem', justifyContent: 'center'}}
            >
              ✅ I Accept
            </button>
            <button
              onClick={handleDeclineTerms}
              style={{
                flex: 1,
                padding: '1rem',
                background: 'var(--danger)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ❌ Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/agent/dashboard" />

      <main className="main-content" style={{paddingTop: '1rem'}}>
        {/* Greeting Card */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          color: 'white',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)',
        }}>
          <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem'}}>
            {getTimeBasedGreeting(user?.username || user?.email?.split('@')[0])}
          </h2>
          <p style={{opacity: 0.9, fontSize: '0.9rem'}}>Welcome back to your agent dashboard</p>
        </div>

        {/* Top Row: Wallet Balance, Store Link, WhatsApp Contact */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {/* Wallet Balance */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '1rem',
            padding: '1.5rem',
            color: 'white',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
          }}>
            <p style={{fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem'}}>Wallet Balance</p>
            <p style={{fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem'}}>GH₵ {walletBalance.toFixed(2)}</p>
            <button 
              onClick={() => window.location.href = '/agent/withdraw'}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '2px solid white',
                background: 'transparent',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              💵 Withdraw
            </button>
          </div>

          {/* Store Link */}
          {user?.store_slug && (
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '1rem',
              padding: '1.5rem',
              color: 'white',
            }}>
              <p style={{fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem'}}>Your Store Link</p>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all',
                marginBottom: '1rem',
                minHeight: '3rem',
                display: 'flex',
                alignItems: 'center',
              }}>
                {window.location.origin}/store/{user.store_slug}
              </div>
              <button
                onClick={copyStoreLink}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'white',
                  color: '#8b5cf6',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📋 Copy Link
              </button>
            </div>
          )}

          {/* WhatsApp Contact */}
          {user?.whatsapp_number && (
            <div style={{
              background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
              borderRadius: '1rem',
              padding: '1.5rem',
              color: 'white',
            }}>
              <p style={{fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem'}}>Admin WhatsApp</p>
              <p style={{fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem'}}>📱 {user.whatsapp_number}</p>
              <a
                href={`https://wa.me/${user.whatsapp_number.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.75rem',
                  background: 'white',
                  color: '#25d366',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                WhatsApp Admin →
              </a>
            </div>
          )}
        </div>

        {/* Animated Rules Notice */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '1rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: 'white',
          textAlign: 'center',
          animation: 'pulse 2s infinite',
          cursor: 'pointer',
        }} onClick={() => setShowTerms(true)}>
          <p style={{fontWeight: '700', fontSize: '1rem', margin: 0}}>
            ⚠️ Always Obey the Rules! 
            <span style={{
              background: 'none',
              border: 'none',
              color: 'white',
              textDecoration: 'underline',
              marginLeft: '0.5rem',
              cursor: 'pointer',
              fontWeight: '700',
            }}>
              Read Rules →
            </span>
          </p>
        </div>

        {/* Terms Modal */}
        {showTerms && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }} onClick={() => setShowTerms(false)}>
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem'}}>📋 Agent Rules & Terms</h2>
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                whiteSpace: 'pre-line',
                lineHeight: '1.8',
                marginBottom: '1.5rem',
              }}>
                {termsText || 'No terms available'}
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="btn-primary"
                style={{width: '100%', padding: '1rem', justifyContent: 'center'}}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => {
              setActiveTab('sell');
              setShowPricing(false);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'sell' && !showPricing ? 'var(--primary)' : 'transparent',
              color: activeTab === 'sell' && !showPricing ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            🛒 Sell Bundle
          </button>
          <button
            onClick={() => {
              setActiveTab('orders');
              setShowPricing(false);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'orders' && !showPricing ? 'var(--primary)' : 'transparent',
              color: activeTab === 'orders' && !showPricing ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            📦 My Orders ({recentOrders.length})
          </button>
          <button
            onClick={() => setShowPricing(!showPricing)}
            style={{
              padding: '0.75rem 1.5rem',
              background: showPricing ? 'var(--primary)' : 'transparent',
              color: showPricing ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            💰 Set Prices
          </button>
        </div>

        {/* Pricing Management Section */}
        {showPricing && (
          <div className="card" style={{marginBottom: '1.5rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
              <h2 style={{fontSize: '1.25rem', fontWeight: '700'}}>💰 Set Your Prices</h2>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '0.5rem',
              }}>
                <label style={{fontWeight: '600', color: 'var(--text-secondary)'}}>
                  Apply Markup:
                </label>
                <input
                  type="number"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '80px',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                  }}
                />
                <span style={{color: 'var(--text-secondary)'}}>%</span>
                <button
                  onClick={applyMarkupToAll}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Apply to All
                </button>
              </div>
            </div>

            {Object.entries(groupedPackages).map(([network, networkPackages]) => (
              <div key={network} style={{marginBottom: '1.5rem'}}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {network === 'MTN' && '📱'}
                  {network === 'Telecel' && '📡'}
                  {network === 'AirtelTigo' && '📶'}
                  {network}
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem',
                }}>
                  {networkPackages.map(pkg => {
                    const agentPrice = agentPrices[pkg.id] || pkg.base_price;
                    const profit = (agentPrice - pkg.base_cost).toFixed(2);
                    
                    return (
                      <div key={pkg.id} style={{
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-color)',
                      }}>
                        <div style={{fontWeight: '700', marginBottom: '0.5rem', fontSize: '1.1rem'}}>
                          {getShortDescription(pkg.description)}
                        </div>
                        <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem'}}>
                          Base: GH₵ {pkg.base_price}
                        </div>
                        <div>
                          <label style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem'}}>
                            Your Price (GH₵)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={agentPrice}
                            onChange={(e) => setAgentPrices({
                              ...agentPrices,
                              [pkg.id]: e.target.value
                            })}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '0.375rem',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontWeight: '600',
                            }}
                          />
                        </div>
                        <div style={{
                          marginTop: '0.5rem',
                          fontSize: '0.75rem',
                          color: profit > 0 ? 'var(--success)' : 'var(--danger)',
                          fontWeight: '600',
                        }}>
                          Profit: GH₵ {profit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={saveAllPrices}
              disabled={savingPrices}
              className="btn-primary"
              style={{width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '1rem'}}
            >
              {savingPrices ? 'Saving...' : '💾 Save All Prices'}
            </button>
          </div>
        )}

        {/* Sell Bundle Tab */}
        {activeTab === 'sell' && !showPricing && (
          <div>
            {/* 1. PACKAGES FIRST */}
            <div style={{marginBottom: '2rem'}}>
              <h3 style={{fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)'}}>
                📦 Select Package by Network
              </h3>
              
              {Object.entries(groupedPackages).map(([network, networkPackages]) => (
                <div key={network} style={{
                  background: 'var(--card-bg)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  border: '1px solid var(--border-color)',
                }}>
                  <h4 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    color: network === 'MTN' ? '#fbbf24' : network === 'Telecel' ? '#ef4444' : '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    {network === 'MTN' && '📱'}
                    {network === 'Telecel' && '📡'}
                    {network === 'AirtelTigo' && '📶'}
                    {network} Packages ({networkPackages.length})
                  </h4>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}>
                    {networkPackages.map(pkg => {
                      const agentPrice = agentPrices[pkg.id] || pkg.base_price;
                      const isSelected = selectedPackage === pkg.id;
                      
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPackage(pkg.id)}
                          style={{
                            padding: '1.25rem',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                            border: `3px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                            borderRadius: '0.75rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            color: isSelected ? 'white' : 'var(--text-primary)',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--primary)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }
                          }}
                        >
                          <div style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem'}}>
                            {getShortDescription(pkg.description)}
                          </div>
                          <div style={{fontSize: '0.875rem', color: isSelected ? 'white' : 'var(--text-secondary)', marginBottom: '0.75rem'}}>
                            {pkg.network}
                          </div>
                          <div style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: isSelected ? 'white' : 'var(--success)',
                            marginBottom: '0.5rem',
                          }}>
                            GH₵ {agentPrice}
                          </div>
                          {isSelected && (
                            <div style={{
                              fontSize: '0.75rem',
                              background: 'rgba(255,255,255,0.2)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              display: 'inline-block',
                            }}>
                              ✓ Selected
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 2. ORDER FORM SECOND */}
            <div className="card">
              <h2 style={{marginBottom: '1.5rem', fontSize: '1.25rem'}}>🛒 Order Details</h2>
              
              {/* Delivery Time Notice */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
                border: '2px solid var(--primary)',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}>
                <p style={{fontSize: '1rem', fontWeight: '600', color: 'var(--primary)', margin: 0}}>
                  ⏱️ Delivery Time: 5 Minutes to 1 Hour
                </p>
                <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0}}>
                  Data bundles are delivered automatically within this timeframe
                </p>
              </div>

              {/* Selected Package Display */}
              {selectedPackage && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                  border: '2px solid var(--primary)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem'}}>Selected Package</p>
                    <p style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)'}}>
                      {(() => {
                        const pkg = packages.find(p => p.id === selectedPackage);
                        return pkg ? `${pkg.network} - ${getShortDescription(pkg.description)}` : '';
                      })()}
                    </p>
                    <p style={{fontSize: '1.25rem', fontWeight: '700', color: 'var(--success)', marginTop: '0.25rem'}}>
                      GH₵ {agentPrices[selectedPackage] || packages.find(p => p.id === selectedPackage)?.base_price}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPackage('')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--danger)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    ✕ Change
                  </button>
                </div>
              )}

              {/* Customer Name (Optional) */}
              <div style={{marginBottom: '1.25rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="input"
                />
              </div>

              {/* Customer Phone Number */}
              <div style={{marginBottom: '1.5rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  Customer Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCustomerPhone(value);
                  }}
                  placeholder="0549722133"
                  className="input"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>

              {/* Order Button */}
              <button
                onClick={handleBuyData}
                disabled={!selectedPackage || !customerPhone || buyingLoading}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  opacity: (!selectedPackage || !customerPhone) ? 0.5 : 1,
                  cursor: (!selectedPackage || !customerPhone) ? 'not-allowed' : 'pointer',
                }}
              >
                {buyingLoading ? 'Processing...' : '📦 Order Now'}
              </button>
            </div>

            {/* Quick Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginTop: '2rem',
            }}>
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
              }}>
                <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📊</div>
                <div style={{fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)'}}>
                  {recentOrders.length}
                </div>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Total Orders</div>
              </div>
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
              }}>
                <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>💰</div>
                <div style={{fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)'}}>
                  GH₵ {recentOrders.reduce((sum, o) => sum + parseFloat(o.amount_paid || 0), 0).toFixed(2)}
                </div>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Total Sales</div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && !showPricing && (
          <div className="card">
            <h2 style={{marginBottom: '1rem'}}>📦 Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📭</div>
                <p>No orders yet. Start selling!</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {recentOrders.slice(0, 10).map(order => (
                  <div key={order.id} style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem'}}>
                      <div>
                        <div style={{fontWeight: '600', marginBottom: '0.25rem'}}>
                          {order.reference}
                        </div>
                        <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                          📱 {order.customer_phone}
                        </div>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: order.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 
                                   order.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: order.status === 'completed' ? 'var(--success)' : 
                               order.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                      }}>
                        {order.status}
                      </span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      <div style={{fontWeight: '700', color: 'var(--primary)'}}>
                        GH₵ {parseFloat(order.amount_paid).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.95; }
        }
      `}</style>
    </div>
  );
};

export default AgentDashboard;