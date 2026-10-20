import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/lib/atoms/Button';
import { Icon } from '@/lib/atoms/Icon';
import { ToastContext, type ToastApi } from './toastContext';
import styles from './style.module.css';

type ToastTone = 'success' | 'error';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const DISMISS_AFTER_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
            <Icon name={toast.tone === 'success' ? 'check' : 'alert'} className={styles.icon} />
            <p className={styles.message}>{toast.message}</p>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="x" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
