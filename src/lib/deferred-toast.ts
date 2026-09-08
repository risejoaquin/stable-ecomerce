type ToastMessages<T = unknown> = {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
};

type ToastOptions = Record<string, unknown>;

let toastModulePromise: Promise<typeof import('react-hot-toast')> | null = null;

function loadToastModule() {
  toastModulePromise ??= import('react-hot-toast');
  return toastModulePromise;
}

export const deferredToast = {
  success(message: string, options?: ToastOptions) {
    void loadToastModule().then(({ toast }) => toast.success(message, options as any));
  },

  error(message: string, options?: ToastOptions) {
    void loadToastModule().then(({ toast }) => toast.error(message, options as any));
  },

  promise<T>(
    promise: Promise<T>,
    messages: ToastMessages<T>,
    options?: ToastOptions,
  ) {
    void loadToastModule().then(({ toast }) =>
      toast.promise(promise, messages as any, options as any),
    );
    return promise;
  },
};

export function preloadDeferredToast() {
  return loadToastModule();
}
