import { Link } from 'react-router-dom';

export function MobileEditorialNav({ cartCount = 0, onCartOpen }: { cartCount?: number; onCartOpen?: () => void }) {
  return (
    <nav className="ss-mobile-nav" aria-label="Mobile storefront navigation">
      <Link to="/">Home</Link>
      <a href="/#shop">Shop</a>
      <a href="/#lookbook">Edit</a>
      <button onClick={onCartOpen} type="button">Bag {cartCount}</button>
    </nav>
  );
}
