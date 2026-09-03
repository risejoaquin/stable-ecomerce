import { Link } from 'react-router-dom';

const concerns = [
  'Hidratación',
  'Luminosidad',
  'Manchas',
  'Acné',
  'Piel sensible',
  'Protección solar',
];

export function ShopByConcern() {
  return (
    <div className="uix-concern-grid" aria-label="Comprar por necesidad de piel">
      {concerns.map((concern) => (
        <Link key={concern} to={`/?search=${encodeURIComponent(concern)}`} className="uix-concern-pill">
          {concern}
        </Link>
      ))}
    </div>
  );
}
