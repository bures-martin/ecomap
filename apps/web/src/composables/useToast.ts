import { inject, shallowRef, type App, type InjectionKey, type ShallowRef } from 'vue';

/**
 * One place for transient confirmations ("Added to the map") and errors.
 *
 * `<ToastHost>` renders the current toast with `role="alert"`, so a screen
 * reader announces it without the user having to go looking for what changed.
 */

export type ToastSeverity = 'success' | 'error' | 'info';

export interface Toast {
  /** Distinguishes two identical messages shown back to back. */
  id: number;
  message: string;
  severity: ToastSeverity;
}

export interface Toaster {
  readonly current: Readonly<ShallowRef<Toast | null>>;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  dismiss: () => void;
}

const TOASTER_KEY: InjectionKey<Toaster> = Symbol('toaster');

export function createToaster(): Toaster & { install: (app: App) => void } {
  const current = shallowRef<Toast | null>(null);
  let nextId = 0;

  const show = (message: string, severity: ToastSeverity): void => {
    nextId += 1;
    current.value = { id: nextId, message, severity };
  };

  const toaster: Toaster = {
    current,
    showSuccess: (message) => {
      show(message, 'success');
    },
    showError: (message) => {
      show(message, 'error');
    },
    showInfo: (message) => {
      show(message, 'info');
    },
    dismiss: () => {
      current.value = null;
    },
  };

  return {
    ...toaster,
    install: (app) => {
      app.provide(TOASTER_KEY, toaster);
    },
  };
}

export function useToast(): Toaster {
  const toaster = inject(TOASTER_KEY, null);
  if (!toaster) throw new Error('useToast needs the toaster plugin installed');
  return toaster;
}
