import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import MobileMenu from '../components/MobileMenu';

const Profile = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile form
  const [profileData, setProfileData] = useState({
    username: '',
    phone: '',
    whatsapp_number: '',
  });
  
  // Password form
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  // Email change form
  const [emailData, setEmailData] = useState({
    new_email: '',
    current_password: '',
    verification_code: '',
  });
  const [emailStep, setEmailStep] = useState(1); // 1: Request, 2: Verify

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        phone: user.phone || '',
        whatsapp_number: user.whatsapp_number || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.put('/auth/profile', {
        username: profileData.username || null,
        phone: profileData.phone || null,
        whatsapp_number: profileData.whatsapp_number || null,
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      if (response.data.user) {
        const updatedUser = { ...user, ...response.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    if (!passwordData.current_password) {
      setMessage({ type: 'error', text: 'Current password is required' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!emailData.current_password) {
      setMessage({ type: 'error', text: 'Current password is required for security' });
      setLoading(false);
      return;
    }

    if (emailData.current_password.length < 6) {
      setMessage({ type: 'error', text: 'Please enter your current password' });
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/request-email-change', {
        new_email: emailData.new_email,
        current_password: emailData.current_password,
      });

      setMessage({ 
        type: 'success', 
        text: response.data.message || 'Verification code sent! Check your email.' 
      });
      setEmailStep(2);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to request email change' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!emailData.verification_code || emailData.verification_code.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit verification code' });
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/confirm-email-change', {
        code: emailData.verification_code,
      });

      setMessage({ 
        type: 'success', 
        text: `Email changed successfully! ${response.data.old_email} → ${response.data.new_email}` 
      });
      
      // Update user context
      const updatedUser = { ...user, email: response.data.new_email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('storage'));
      
      // Reset form
      setEmailData({
        new_email: '',
        current_password: '',
        verification_code: '',
      });
      setEmailStep(1);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to confirm email change' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <MobileMenu currentPage="/profile" />
      
      <main className="main-content" style={{paddingTop: '1rem'}}>
        <div className="card">
          <h2 style={{marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700'}}>👤 Profile Settings</h2>
          
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

          {/* Profile Information */}
          <form onSubmit={handleUpdateProfile} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem'}}>
            <h3 style={{fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>📝 Account Information</h3>
            
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  fontSize: '1rem',
                  cursor: 'not-allowed',
                }}
              />
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                To change email, use the "Change Email" section below
              </p>
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>Username</label>
              <input
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                className="input"
                placeholder="Your username"
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>Phone Number</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                className="input"
                placeholder="0240000000"
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>WhatsApp Number</label>
              <input
                type="tel"
                value={profileData.whatsapp_number}
                onChange={(e) => setProfileData({...profileData, whatsapp_number: e.target.value})}
                className="input"
                placeholder="233240000000"
              />
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                Include country code (e.g., 233 for Ghana)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '0.5rem'}}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>

          {/* Change Email Section */}
          <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '2rem', marginBottom: '2rem'}}>
            <h3 style={{fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)'}}>📧 Change Email</h3>
            <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
              🔐 For security, you must enter your current password to change your email
            </p>
            
            {emailStep === 1 ? (
              <form onSubmit={handleRequestEmailChange} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                    New Email Address <span style={{color: 'var(--danger)'}}>*</span>
                  </label>
                  <input
                    type="email"
                    value={emailData.new_email}
                    onChange={(e) => setEmailData({...emailData, new_email: e.target.value})}
                    className="input"
                    placeholder="newemail@example.com"
                    required
                  />
                  <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                    Verification code will be sent to this email
                  </p>
                </div>

                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                    Current Password <span style={{color: 'var(--danger)'}}>*</span>
                  </label>
                  <input
                    type="password"
                    value={emailData.current_password}
                    onChange={(e) => setEmailData({...emailData, current_password: e.target.value})}
                    className="input"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                    Required to verify you own this account
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !emailData.new_email || !emailData.current_password}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    opacity: (loading || !emailData.new_email || !emailData.current_password) ? 0.6 : 1,
                    cursor: (loading || !emailData.new_email || !emailData.current_password) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmailChange} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '0.5rem',
                  color: 'var(--info)',
                  fontSize: '0.875rem',
                }}>
                  ✅ Verification code sent to <strong>{emailData.new_email}</strong>
                  <br />
                  <span style={{opacity: 0.8}}>Code expires in 15 minutes. Check spam folder.</span>
                </div>

                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                    Verification Code <span style={{color: 'var(--danger)'}}>*</span>
                  </label>
                  <input
                    type="text"
                    value={emailData.verification_code}
                    onChange={(e) => setEmailData({...emailData, verification_code: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                    className="input"
                    placeholder="123456"
                    maxLength="6"
                    required
                    style={{letterSpacing: '0.5rem', fontSize: '1.25rem', textAlign: 'center', fontWeight: '700'}}
                  />
                </div>

                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button
                    type="submit"
                    disabled={loading || !emailData.verification_code || emailData.verification_code.length !== 6}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      opacity: (loading || !emailData.verification_code || emailData.verification_code.length !== 6) ? 0.6 : 1,
                      cursor: (loading || !emailData.verification_code || emailData.verification_code.length !== 6) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Verifying...' : 'Confirm Email Change'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailStep(1);
                      setEmailData({...emailData, verification_code: '', current_password: ''});
                      setMessage({ type: '', text: '' });
                    }}
                    style={{
                      padding: '1rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Change Password Section */}
          <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
            <h3 style={{fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)'}}>🔐 Change Password</h3>
            <form onSubmit={handleChangePassword} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  Current Password <span style={{color: 'var(--danger)'}}>*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  New Password <span style={{color: 'var(--danger)'}}>*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  className="input"
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  minLength="6"
                  required
                />
                <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                  Minimum 6 characters
                </p>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)'}}>
                  Confirm New Password <span style={{color: 'var(--danger)'}}>*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  opacity: (loading || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) ? 0.6 : 1,
                  cursor: (loading || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;