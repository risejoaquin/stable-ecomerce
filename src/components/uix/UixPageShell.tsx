import React from 'react';
import { CartDrawer, useCart } from '../../App';
import { EditorialHeader } from '../editorial/EditorialHeader';
import { MobileEditorialNav } from '../editorial/MobileEditorialNav';

type UixPageShellProps = {
  children: React.ReactNode;
  className?: string;
  mainClassName?: string;
  header?: boolean;
  mobileNav?: boolean;
};

export function UixPageShell({ children, className = '', mainClassName = '', header = true, mobileNav = true }: UixPageShellProps) {
  const { items, setIsCartOpen } = useCart();
  const cartItemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  return (
    <div className={`uix-page-shell ss-account-theme ${className}`.trim()}>
      {header && <EditorialHeader cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />}
      <main className={`uix-page-shell__main ${mainClassName}`.trim()}>{children}</main>
      {mobileNav && <MobileEditorialNav cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />}
      <CartDrawer storeId={undefined} themeColor="#2b1d17" buttonColor="#2b1d17" />
    </div>
  );
}
