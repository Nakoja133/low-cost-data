import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

const Store = () => {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('buy');
  
  const [selectedPackage, setSelectedPackage] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [ordering, setOrdering] = useState(false);
  
  const [trackPhone, setTrackPhone] = useState('');
  const [trackName, setTrackName] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    fetchStore();
  }, [slug]);

  const fetchStore = async () => {
    try {
      const response = await api.get(`/store/${slug}`);
      setStore(response.data);
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!selectedPackage || !customerPhone) {
      alert('Please select a package and enter phone number');
      return;
    }

    const confirmOrder = window.confirm(
      '📦 Order Confirmation\n\n' +
      '⏱️ Delivery Time: 5 minutes to 1 hour\n\n' +
      'Your data bundle will be delivered to your phone number within this timeframe.\n\n' +
      'Do you want to proceed with payment?'
    );

    if (!confirmOrder) return;

    setOrdering(true);
    try {
      const response = await api.post(`/store/${slug}/order`, {
        phone: customerPhone,
        package_id: selectedPackage,
        customer_name: customerName,
      });
      window.location.href = response.data.payment_url;
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || 'Failed to create order'));
    } finally {
      setOrdering(false);
    }
  };

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setTrackingError('');
    setTrackedOrder(null);
    
    try {
      const response = await api.get(`/store/${slug}/orders/track`, {
        params: {
          phone: trackPhone,
          name: trackName || undefined,
        }
      });
      setTrackedOrder(response.data);
    } catch (error) {
      setTrackingError('No orders found for this phone number');
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    let icon = '👋';
    let businessMessage = 'Welcome to our store!';
    
    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
      icon = '🌅';
      businessMessage = 'Start your day with affordable data bundles!';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
      icon = '☀️';
      businessMessage = 'Stay connected with our best deals!';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good evening';
      icon = '🌆';
      businessMessage = 'We\'re here to serve you tonight!';
    } else {
      greeting = 'Good night';
      icon = '🌙';
      businessMessage = 'Late night browsing? We\'ve got you covered!';
    }
    
    return { greeting, icon, businessMessage };
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: 'var(--text-secondary)',
        }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span>Loading store...</span>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '2rem',
      }}>
        <div style={{textAlign: 'center', maxWidth: '400px'}}>
          <div style={{fontSize: '4rem', marginBottom: '1rem'}}>😔</div>
          <h1 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>
            Store Not Found
          </h1>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
            This store doesn't exist or has been deactivated.
          </p>
          <a 
            href="/" 
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  const groupedPackages = store.packages.reduce((acc, pkg) => {
    if (!acc[pkg.network]) acc[pkg.network] = [];
    acc[pkg.network].push(pkg);
    return acc;
  }, {});

  const getGBAmount = (description) => {
    const match = description.match(/(\d+\.?\d*)\s*GB/i);
    return match ? match[1] + 'GB' : description;
  };

  const greeting = getTimeBasedGreeting();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      paddingBottom: '2rem',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        padding: '2.5rem 1rem',
        textAlign: 'center',
        color: 'white',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{position: 'relative', zIndex: 1}}>
          <div style={{fontSize: '3.5rem', marginBottom: '0.75rem'}}>🏪</div>
          <h1 style={{fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem'}}>
            {store.agent.username || store.agent.email?.split('@')[0]}'s Data Store
          </h1>
          
          {/* Time-based greeting */}
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '0.75rem',
            padding: '1rem',
            margin: '1rem 0',
            backdropFilter: 'blur(10px)',
          }}>
            <p style={{fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem'}}>
              {greeting.icon} {greeting.greeting}, Customer!
            </p>
            <p style={{fontSize: '0.9rem', opacity: 0.95}}>
              {greeting.businessMessage}
            </p>
          </div>
          
          <p style={{opacity: 0.9, fontSize: '0.9rem', marginBottom: '1rem'}}>
            Buy affordable data bundles instantly
          </p>
          
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '0.5rem',
          }}>
            {/* WhatsApp Contact Button - Direct chat with agent */}
            {store.agent.whatsapp_number && (
              <a
                href={`https://wa.me/${store.agent.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hello%20${store.agent.username || 'there'}!%20I%20want%20to%20inquire%20about%20data%20bundles.`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{fontSize: '1.1rem'}}>💬</span>
                <span>Chat on WhatsApp</span>
              </a>
            )}
            
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        gap: '0.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button
          onClick={() => setActiveTab('buy')}
          style={{
            flex: 1,
            padding: '0.875rem',
            background: activeTab === 'buy' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'buy' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
          }}
        >
          🛒 Buy Bundle
        </button>
        <button
          onClick={() => setActiveTab('track')}
          style={{
            flex: 1,
            padding: '0.875rem',
            background: activeTab === 'track' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'track' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
          }}
        >
          📦 Track Order
        </button>
      </div>

      {/* Content */}
      <div style={{padding: '1.5rem 1rem', maxWidth: '800px', margin: '0 auto'}}>
        {activeTab === 'buy' ? (
          <div>
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
                Your data bundle will be delivered automatically within this timeframe
              </p>
            </div>

            {/* Packages Grid */}
            <div style={{marginBottom: '1.5rem'}}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '1.25rem',
                color: 'var(--text-primary)',
              }}>
                Select Package
              </h2>
              
              {Object.entries(groupedPackages).map(([network, packages]) => (
                <div key={network} style={{marginBottom: '1.5rem'}}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    marginBottom: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {network === 'MTN' && '📱'}
                    {network === 'Telecel' && '📡'}
                    {network === 'AirtelTigo' && '📶'}
                    {network}
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.75rem',
                  }}>
                    {packages.map(pkg => {
                      const isSelected = selectedPackage === pkg.id;
                      
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg.id)}
                          style={{
                            padding: '1.25rem 1rem',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                            borderRadius: '0.75rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            color: isSelected ? 'white' : 'var(--text-primary)',
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
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          <div style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem', lineHeight: '1.2'}}>
                            {getGBAmount(pkg.description)}
                          </div>
                          <div style={{fontSize: '1.1rem', fontWeight: '700', color: isSelected ? 'white' : 'var(--primary)'}}>
                            GH₵ {pkg.price}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Form */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '1.25rem',
                color: 'var(--text-primary)',
              }}>
                📝 Your Details
              </h2>
              <form onSubmit={handleOrder} id="buy-form" style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Kwame Mensah"
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0549722133"
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                    }}
                    required
                  />
                  <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                    The number that will receive the data bundle
                  </p>
                </div>

                {selectedPackage && (
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Selected Package:</span>
                    <span style={{fontWeight: '700', color: 'var(--primary)'}}>
                      {(() => {
                        const pkg = store.packages.find(p => p.id === selectedPackage);
                        return pkg ? `${getGBAmount(pkg.description)} - GH₵ ${pkg.price}` : '';
                      })()}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={ordering || !selectedPackage}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: ordering || !selectedPackage 
                      ? 'var(--bg-tertiary)' 
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: ordering || !selectedPackage ? 'var(--text-muted)' : 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '700',
                    fontSize: '1rem',
                    cursor: ordering || !selectedPackage ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {ordering ? 'Processing...' : 'Proceed to Payment →'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid var(--border-color)',
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '1.25rem',
              color: 'var(--text-primary)',
            }}>
              📦 Track Your Order
            </h2>
            <form onSubmit={handleTrackOrder} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={trackPhone}
                  onChange={(e) => setTrackPhone(e.target.value)}
                  placeholder="0549722133"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  placeholder="Kwame Mensah"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🔍 Track Order
              </button>
            </form>

            {trackingError && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.5rem',
                color: 'var(--danger)',
                textAlign: 'center',
              }}>
                {trackingError}
              </div>
            )}

            {trackedOrder && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                background: 'var(--bg-secondary)',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '1rem',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <div>
                    <div style={{fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem'}}>
                      {trackedOrder.reference}
                    </div>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                      {new Date(trackedOrder.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: trackedOrder.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 
                               trackedOrder.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: trackedOrder.status === 'completed' ? 'var(--success)' : 
                           trackedOrder.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {trackedOrder.status}
                  </span>
                </div>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Package:</span>
                    <span style={{fontWeight: '600', color: 'var(--text-primary)'}}>
                      {getGBAmount(trackedOrder.package_name)}
                    </span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Phone:</span>
                    <span style={{fontWeight: '600', color: 'var(--text-primary)'}}>
                      {trackedOrder.customer_phone}
                    </span>
                  </div>
                  {trackedOrder.customer_name && (
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Name:</span>
                      <span style={{fontWeight: '600', color: 'var(--text-primary)'}}>
                        {trackedOrder.customer_name}
                      </span>
                    </div>
                  )}
                  <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)'}}>
                    <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Amount Paid:</span>
                    <span style={{fontWeight: '700', color: 'var(--primary)', fontSize: '1.1rem'}}>
                      GH₵ {parseFloat(trackedOrder.amount_paid).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
        borderTop: '1px solid var(--border-color)',
        marginTop: '2rem',
      }}>
        <p style={{marginBottom: '0.25rem'}}>Powered by Low-Cost Data Bundles</p>
        <p style={{fontSize: '0.75rem'}}>© 2026 All rights reserved</p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Store;