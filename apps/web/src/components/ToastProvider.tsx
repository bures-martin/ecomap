import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * One place for transient confirmations ("Added to the map") and errors.
 *
 * The snackbar is rendered with `role="alert"`, so a screen reader announces it
 * without the user having to go looking for what changed.
 */

interface Toast {
  message: string;
  severity: AlertColor;
}

interface ToastContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((message: string, severity: AlertColor) => {
    setToast({ message, severity });
    setOpen(true);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (message) => {
        show(message, 'success');
      },
      showError: (message) => {
        show(message, 'error');
      },
      showInfo: (message) => {
        show(message, 'info');
      },
    }),
    [show],
  );

  return (
    <ToastContext value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toast?.severity === 'error' ? 8000 : 4000}
        onClose={(_event, reason) => {
          /* Do not steal a message away because the user clicked elsewhere. */
          if (reason !== 'clickaway') setOpen(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'info'}
          variant="filled"
          onClose={() => {
            setOpen(false);
          }}
          sx={{ width: '100%' }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
