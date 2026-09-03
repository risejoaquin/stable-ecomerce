export type LogoutOptions = {
  redirectTo?: string;
  reload?: boolean;
};

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('guest_email');
}

export function logoutUser(options: LogoutOptions = {}) {
  if (typeof window === 'undefined') return;

  const redirectTo = options.redirectTo ?? '/';
  clearAuthSession();
  window.dispatchEvent(new Event('auth:logout'));

  if (options.reload) {
    window.location.href = redirectTo;
    return;
  }

  if (window.location.pathname !== redirectTo) {
    window.location.assign(redirectTo);
    return;
  }

  window.location.reload();
}
