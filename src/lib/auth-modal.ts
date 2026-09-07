export type AuthModalMode = 'signin' | 'signup' | 'forgot-password';

type AuthModalOpener = (mode: AuthModalMode) => void;

let authModalOpener: AuthModalOpener | null = null;

export function setAuthModalOpener(opener: AuthModalOpener | null) {
  authModalOpener = opener;
}

export function openAuthDialog(mode: AuthModalMode = 'signin') {
  if (authModalOpener) {
    authModalOpener(mode);
    return true;
  }

  window.dispatchEvent(new CustomEvent('auth:open', { detail: { mode } }));
  return false;
}
