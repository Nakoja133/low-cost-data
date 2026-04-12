import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const FeedbackContext = createContext(null);

const toastStyles = {
  success: {
    background: 'linear-gradient(135deg, rgba(16,185,129,0.96), rgba(5,150,105,0.96))',
    border: '1px solid rgba(110,231,183,0.45)',
  },
  error: {
    background: 'linear-gradient(135deg, rgba(239,68,68,0.96), rgba(220,38,38,0.96))',
    border: '1px solid rgba(252,165,165,0.45)',
  },
  info: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.96), rgba(139,92,246,0.96))',
    border: '1px solid rgba(196,181,253,0.45)',
  },
};

export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [dialogValue, setDialogValue] = useState('');
  const [dialogError, setDialogError] = useState('');
  const resolverRef = useRef(null);
  const timeoutIdsRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message, options = {}) => {
    if (!message) return null;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = options.type || 'info';
    const duration = options.duration ?? 3200;

    setToasts((current) => [...current, { id, message, type }]);

    const timeoutId = window.setTimeout(() => {
      dismissToast(id);
    }, duration);

    timeoutIdsRef.current.set(id, timeoutId);
    return id;
  }, [dismissToast]);

  const closeDialog = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    setDialogValue('');
    setDialogError('');
    if (resolve) resolve(result);
  }, []);

  const showConfirm = useCallback((options = {}) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setDialogValue('');
    setDialogError('');
    setDialog({
      kind: 'confirm',
      title: options.title || 'Please Confirm',
      message: options.message || 'Are you sure you want to continue?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      tone: options.tone || 'primary',
    });
  }), []);

  const showPrompt = useCallback((options = {}) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setDialogValue(options.defaultValue || '');
    setDialogError('');
    setDialog({
      kind: 'prompt',
      title: options.title || 'Enter Value',
      message: options.message || '',
      label: options.label || 'Value',
      placeholder: options.placeholder || '',
      confirmText: options.confirmText || 'Continue',
      cancelText: options.cancelText || 'Cancel',
      tone: options.tone || 'primary',
      inputType: options.inputType || 'text',
      inputMode: options.inputMode,
      autoComplete: options.autoComplete || 'off',
      name: options.name || 'feedback-input',
      multiline: Boolean(options.multiline),
      validate: options.validate,
    });
  }), []);

  const handleDialogConfirm = useCallback(() => {
    if (!dialog) return;

    if (dialog.kind === 'confirm') {
      closeDialog(true);
      return;
    }

    const nextError = dialog.validate ? dialog.validate(dialogValue) : '';
    if (nextError) {
      setDialogError(nextError);
      return;
    }

    closeDialog(dialogValue);
  }, [closeDialog, dialog, dialogValue]);

  const value = useMemo(() => ({
    showToast,
    showSuccess: (message, options = {}) => showToast(message, { ...options, type: 'success' }),
    showError: (message, options = {}) => showToast(message, { ...options, type: 'error' }),
    showInfo: (message, options = {}) => showToast(message, { ...options, type: 'info' }),
    showConfirm,
    showPrompt,
  }), [showConfirm, showPrompt, showToast]);

  const confirmButtonStyle = dialog?.tone === 'danger'
    ? { background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', border: 'none' }
    : { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none' };

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {toasts.length > 0 && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 4000, width: 'min(92vw, 460px)', display: 'grid', gap: '0.6rem', pointerEvents: 'none' }}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                padding: '0.95rem 1rem',
                borderRadius: '0.95rem',
                color: 'white',
                boxShadow: '0 18px 45px rgba(0,0,0,0.28)',
                backdropFilter: 'blur(16px)',
                animation: 'toastDrop 0.22s ease-out',
                ...toastStyles[toast.type],
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ fontSize: '1rem', lineHeight: 1.2 }}>
                  {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}
                </div>
                <div style={{ flex: 1, fontWeight: '700', fontSize: '0.92rem', lineHeight: 1.45 }}>
                  {toast.message}
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  style={{ pointerEvents: 'auto', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3500, background: 'rgba(3,7,18,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: 'min(92vw, 430px)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '1rem', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', padding: '1.35rem', animation: 'feedbackPop 0.18s ease-out' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, marginBottom: dialog.message ? '0.55rem' : 0, fontSize: '1.12rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {dialog.title}
              </h3>
              {dialog.message && (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                  {dialog.message}
                </p>
              )}
            </div>

            {dialog.kind === 'prompt' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: '700', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  {dialog.label}
                </label>
                {dialog.multiline ? (
                  <textarea
                    value={dialogValue}
                    onChange={(event) => { setDialogValue(event.target.value); if (dialogError) setDialogError(''); }}
                    placeholder={dialog.placeholder}
                    autoComplete={dialog.autoComplete}
                    name={dialog.name}
                    rows={4}
                    style={{ width: '100%', resize: 'vertical', minHeight: '120px', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: `1px solid ${dialogError ? 'rgba(239,68,68,0.5)' : 'var(--border-color)'}`, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }}
                  />
                ) : (
                  <input
                    type={dialog.inputType}
                    value={dialogValue}
                    onChange={(event) => { setDialogValue(event.target.value); if (dialogError) setDialogError(''); }}
                    placeholder={dialog.placeholder}
                    autoComplete={dialog.autoComplete}
                    inputMode={dialog.inputMode}
                    name={dialog.name}
                    readOnly={dialog.inputType === 'password'}
                    onFocus={(event) => {
                      if (dialog.inputType === 'password') event.target.removeAttribute('readonly');
                    }}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: `1px solid ${dialogError ? 'rgba(239,68,68,0.5)' : 'var(--border-color)'}`, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }}
                  />
                )}
                {dialogError && (
                  <p style={{ margin: '0.55rem 0 0', color: 'var(--danger)', fontSize: '0.82rem', fontWeight: '700' }}>
                    {dialogError}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => closeDialog(dialog.kind === 'confirm' ? false : null)}
                style={{ flex: 1, padding: '0.82rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '700' }}
              >
                {dialog.cancelText}
              </button>
              <button
                onClick={handleDialogConfirm}
                style={{ flex: 1.2, padding: '0.82rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '800', ...confirmButtonStyle }}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastDrop {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes feedbackPop {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};
