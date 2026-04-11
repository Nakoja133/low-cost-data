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
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!actionConfig) return;
    const loadSettings = async () => {
      try {
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
      }
    };

    loadSettings();
  }, [action, actionConfig]);

  if (!actionConfig) {
    return (
      <div className="dashboard-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Invalid action</h1>
          <p>This admin action is not available.</p>
          <button onClick={() => navigate('/admin/dashboard')} style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '700' }}>
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
    <div className="dashboard-container" style={{ minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>{actionConfig.label}</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{actionConfig.description}</p>
          </div>
          <button onClick={() => navigate('/admin/dashboard')} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '700' }}>
            Back
          </button>
        </div>

        <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          {message.text && (
            <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.75rem', background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
              {message.text}
            </div>
          )}

          <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.75rem' }}>{actionConfig.fieldLabel}</label>
          <input
            type={actionConfig.type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={actionConfig.placeholder}
            style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
          />

          <button
            onClick={handleSave}
            disabled={loading}
            style={{ marginTop: '1.25rem', width: '100%', padding: '0.95rem', borderRadius: '0.75rem', border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', cursor: 'pointer', fontWeight: '700', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Saving...' : `Save ${actionConfig.label}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockActionPage;
