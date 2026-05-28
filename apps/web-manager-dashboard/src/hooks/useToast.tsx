import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ToastOptions {
  message: string;
  severity?: AlertColor; // 'success' | 'error' | 'warning' | 'info'
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions | string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

function SlideUp(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');
  const [duration, setDuration] = useState(4000);

  const show = useCallback((opts: ToastOptions | string) => {
    const normalized: ToastOptions =
      typeof opts === 'string' ? { message: opts, severity: 'info' } : opts;
    setMessage(normalized.message);
    setSeverity(normalized.severity ?? 'info');
    setDuration(normalized.duration ?? 4000);
    setOpen(false); // reset so re-triggering same message still shows
    setTimeout(() => setOpen(true), 10);
  }, []);

  const success = useCallback((msg: string) => show({ message: msg, severity: 'success' }), [show]);
  const error   = useCallback((msg: string) => show({ message: msg, severity: 'error'   }), [show]);
  const warning = useCallback((msg: string) => show({ message: msg, severity: 'warning' }), [show]);
  const info    = useCallback((msg: string) => show({ message: msg, severity: 'info'    }), [show]);

  return (
    <ToastContext.Provider value={{ toast: show, success, error, warning, info }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={SlideUp}
        sx={{ mb: 1, mr: 1 }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          variant="filled"
          sx={{
            minWidth: 320,
            maxWidth: 480,
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            '& .MuiAlert-icon': { fontSize: '1.2rem' },
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
