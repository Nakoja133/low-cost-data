import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const MobileMenu = ({ currentPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [
        { label: 'Dashboard', path: '/admin/dashboard', icon: '🎛️' },
        { label: 'Users', path: '/admin/users', icon: '👥' },
        { label: 'Withdrawals', path: '/admin/withdrawals', icon: '💰' },
        { label: 'Packages', path: '/admin/packages', icon: '📦' },
        { label: 'Orders', path: '/admin/orders', icon: '📊' },
        { label: 'Terms/Rules', path: '/admin/terms', icon: '📋' },
        { label: 'Profile', path: '/profile', icon: '👤' },
      ];
    } else {
      return [
        { label: 'Dashboard', path: '/agent/dashboard', icon: '🏠' },
        { label: 'My Store', path: `/store/${user?.store_slug}`, icon: '🏪', external: true },
        { label: 'Withdraw', path: '/agent/withdraw', icon: '💵' },
        { label: 'Invite Agent', path: '/agent/invite', icon: '📨' },
        { label: 'Statistics', path: '/agent/statistics', icon: '📈' },
        { label: 'Profile', path: '/profile', icon: '👤' },
      ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}>
        <div style={{
          fontWeight: '700',
          fontSize: '1.1rem',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {user?.role === 'admin' ? '🎛️ Admin' : '🏪 Agent'}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem',
          }}
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '1rem 1rem 0 0',
            padding: '1.5rem',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            {/* User Info */}
            <div style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem'}}>
                {user?.username || user?.email?.split('@')[0]}
              </div>
              <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                {user?.email}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                background: user?.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: user?.role === 'admin' ? 'var(--primary)' : 'var(--info)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                marginTop: '0.5rem',
                textTransform: 'uppercase',
              }}>
                {user?.role}
              </div>
            </div>

            {/* Theme Toggle */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.875rem 1rem',
              marginBottom: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '0.5rem',
            }}>
              <span style={{color: 'var(--text-secondary)', fontWeight: '500'}}>Theme</span>
              <button
                onClick={toggleTheme}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 1rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                }}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>

            {/* Menu Items */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    if (item.external) {
                      window.open(item.path, '_blank');
                    } else {
                      navigate(item.path);
                    }
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: currentPage === item.path ? 'var(--bg-secondary)' : 'none',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontWeight: currentPage === item.path ? '600' : '400',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== item.path) {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== item.path) {
                      e.currentTarget.style.background = 'none';
                    }
                  }}
                >
                  <span style={{fontSize: '1.25rem'}}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.5rem',
                color: 'var(--danger)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileMenu;