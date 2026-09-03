import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const routines = [
  { title: 'Piel luminosa', copy: 'Limpieza, hidratación y glow diario sin saturar tu rutina.', href: '/?concern=glow' },
  { title: 'Barrera fuerte', copy: 'Cuidado calmante para piel sensible, reseca o irritada.', href: '/?concern=barrier' },
  { title: 'Control y balance', copy: 'Texturas ligeras para brillo, poros y sensación fresca.', href: '/?concern=balance' },
];

export function RoutineCards() {
  return (
    <div className="uix-routine-grid">
      {routines.map((routine, index) => (
        <Link key={routine.title} to={routine.href} className="uix-routine-card">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <h3>{routine.title}</h3>
          <p>{routine.copy}</p>
          <em>Ver rutina <ArrowRight size={14} /></em>
        </Link>
      ))}
    </div>
  );
}
