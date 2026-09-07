import React from 'react';

const lazyNamed = <T extends React.ComponentType<any>>(
  loader: () => Promise<Record<string, any>>,
  exportName: string
) => React.lazy(async () => {
  const mod = await loader();
  return { default: mod[exportName] as T };
});

// PERFORMANCE/FRONTEND D: route-level lazy loading boundary.
// Keep route imports centralized to avoid pulling admin/customer-heavy screens into the initial bundle.
export const LazyHomePage = lazyNamed(() => import('../pages/store/HomePage'), 'HomePage');
export const LazyRecoverCartPage = lazyNamed(() => import('../pages/store/RecoverCartPage'), 'RecoverCartPage');
export const LazyVerifyEmailPage = lazyNamed(() => import('../pages/store/VerifyEmailPage'), 'VerifyEmailPage');
export const LazyCheckoutSuccessPage = lazyNamed(() => import('../pages/store/CheckoutSuccessPage'), 'CheckoutSuccessPage');
export const LazyResetPasswordPage = lazyNamed(() => import('../pages/store/ResetPasswordPage'), 'ResetPasswordPage');
export const LazyTrackOrderPage = lazyNamed(() => import('../pages/store/TrackOrderPage'), 'TrackOrderPage');
export const LazyMyOrdersPage = lazyNamed(() => import('../pages/store/MyOrdersPage'), 'MyOrdersPage');
export const LazyProfilePage = lazyNamed(() => import('../pages/store/ProfilePage'), 'ProfilePage');
export const LazyWishlistPage = lazyNamed(() => import('../pages/store/WishlistPage'), 'WishlistPage');
export const LazyFaqPage = lazyNamed(() => import('../pages/store/FaqPage'), 'FaqPage');

export const LazyPrivacyPolicyPage = lazyNamed(() => import('../pages/legal/PrivacyPolicyPage'), 'PrivacyPolicyPage');
export const LazyTermsAndConditionsPage = lazyNamed(() => import('../pages/legal/TermsAndConditionsPage'), 'TermsAndConditionsPage');
export const LazyReturnPolicyPage = lazyNamed(() => import('../pages/legal/ReturnPolicyPage'), 'ReturnPolicyPage');
export const LazyContactPage = lazyNamed(() => import('../pages/legal/ContactPage'), 'ContactPage');
export const LazyNotFoundPage = lazyNamed(() => import('../pages/NotFoundPage'), 'NotFoundPage');

export const LazyAdminDashboard = lazyNamed(() => import('../pages/admin/AdminDashboard'), 'AdminDashboard');
export const LazyProductsPage = lazyNamed(() => import('../pages/admin/ProductsPage'), 'ProductsPage');
export const LazyAdminCategoriesPage = lazyNamed(() => import('../pages/admin/AdminCategoriesPage'), 'AdminCategoriesPage');
export const LazyCouponsPage = lazyNamed(() => import('../pages/admin/CouponsPage'), 'CouponsPage');
export const LazyAdminOrdersPage = lazyNamed(() => import('../pages/admin/AdminOrdersPage'), 'AdminOrdersPage');
export const LazyAdminCustomersPage = lazyNamed(() => import('../pages/admin/AdminCustomersPage'), 'AdminCustomersPage');
export const LazyAdminCommercialPage = lazyNamed(() => import('../pages/admin/AdminCommercialPage'), 'AdminCommercialPage');
export const LazyAdminEmailCenterPage = lazyNamed(() => import('../pages/admin/AdminEmailCenterPage'), 'AdminEmailCenterPage');
export const LazyAdminSettingsPage = lazyNamed(() => import('../pages/admin/AdminSettingsPage'), 'AdminSettingsPage');
