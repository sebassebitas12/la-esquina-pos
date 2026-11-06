import { Link } from 'react-router-dom';

export function Brand({ to = '/', compact = false }) {
  return (
    <Link className={`brand${compact ? ' brand--compact' : ''}`} to={to} aria-label="La Esquina, Minimercado">
      <img src="/brand/logo-badge.jpg" alt="Logo La Esquina" className="brand-logo-img" />
      <div className="brand-copy">
        <strong>LA ESQUINA</strong>
        <small>Minimercado</small>
      </div>
    </Link>
  );
}
