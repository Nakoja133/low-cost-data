import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const ACTIONS = {
  'min-withdrawal': {
    label: 'Minimum Withdrawal',
    description: 'Set the minimum agent withdrawal amount.',
    placeholder: 'e.g. 10.00',
    fieldLabel: 'Minimum Withdrawal Amount',
    type: 'number',
  },
  'whatsapp-group': {
    label: 'WhatsApp Group Link',
    description: 'Update the WhatsApp group link for agents.',
    placeholder: 'https://chat.whatsapp.com/...',
    fieldLabel: 'WhatsApp Link',
    type: 'url',
  },
  'telegram-link': {
    label: 'Telegram Link',
    description: 'Update the Telegram group or channel link.',
    placeholder: 'https://t.me/...',
    fieldLabel: 'Telegram Link',
    type: 'url',
  },
  'help-center-email': {
    label: 'Help Center Email',
    description: 'Update the email address agents should contact for support.',
    placeholder: 'help@example.com',
    fieldLabel: 'Help Center Email',
    type: 'email',
  },
};

const LockActionPage = () => {
  const { action } = useParams();
  const navigate = useNavigate();
  const actionConfig = ACTIONS[action];

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); // For initial load
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!actionConfig) return;

    const loadSettings = async () => {
      try {
        setFetching(true);
        const res = await api.get('/admin/settings');
        const settings = res.data.settings || {};

        switch (action) {
          case 'min-withdrawal':
            setValue(settings.min_withdrawal_amount || '');
            break;
          case 'whatsapp-group':
            setValue(settings.whatsapp_group_link || '');
            break;
          case 'telegram-link':
            setValue(settings.telegram_link || '');
            break;
          case 'help-center-email':
            setValue(settings.help_center_email || '');
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Failed to load admin settings', err);
      } finally {
        setFetching(false);
      }
    };

    loadSettings();
  }, [action, actionConfig]);

  // Handle Invalid Action
  if (!actionConfig) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>Invalid Action</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>This admin action is not available.</p>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              padding: '0.85rem 1.5rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.95rem'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    const payload = {};
    let endpoint = '';

    switch (action) {
      case 'min-withdrawal':
        endpoint = '/admin/settings/min-withdrawal';
        payload.amount = parseFloat(value);
        if (isNaN(payload.amount) || payload.amount < 0) {
          setMessage({ type: 'error', text: 'Enter a valid minimum withdrawal amount.' });
          return;
        }
        break;
      case 'whatsapp-group':
        endpoint = '/admin/settings/whatsapp-group';
        payload.link = value;
        break;
      case 'telegram-link':
        endpoint = '/admin/settings/telegram-link';
        payload.link = value;
        break;
      case 'help-center-email':
        endpoint = '/admin/settings/help-center-email';
        payload.email = value;
        break;
      default:
        break;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put(endpoint, payload);
      setMessage({ type: 'success', text: `${actionConfig.label} updated successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save settings.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>
              {actionConfig.label}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
              {actionConfig.description}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ← Back
          </button>
        </div>

        {/* Form Card */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>

          {fetching ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
              <p>Loading settings...</p>
            </div>
          ) : (
            <>
              {/* Message Alerts */}
              {message.text && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {message.type === 'success' ? '✅' : '❌'} {message.text}
                </div>
              )}

              {/* Input Field */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {actionConfig.fieldLabel}
                </label>
                <input
                  type={actionConfig.type}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={actionConfig.placeholder}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Saving...' : `Save ${actionConfig.label}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LockActionPage;