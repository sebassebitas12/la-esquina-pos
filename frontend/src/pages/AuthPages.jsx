import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

function AuthFrame({ title, description, children, footer }) {
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-page-title">
        <img src="/brand/logo-badge.jpg" alt="La Esquina" className="auth-brand-badge" />
        <p className="auth-brand-wordmark">LA ESQUINA <span>MINIMERCADO</span></p>
        <div className="auth-form-wrap">
          <h1 id="auth-page-title">{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </section>
    </main>
  );
}

function AuthField({ id, label, type = 'text', value, onChange, autoComplete, required = true, minLength, maxLength }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
      />
    </div>
  );
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState(location.state?.correo || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ correo, password });
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Iniciar sesión"
      description="Ingresá con el correo y la contraseña de tu cuenta."
      footer={
        <>
          ¿Todavía no tenés cuenta?{' '}
          <Link to="/registro">
            Crear cuenta <Icon name="arrow" size={14} />
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        {location.state?.registrationComplete && (
          <p className="form-success" role="status">
            Tu cuenta quedó lista. Iniciá sesión para continuar.
          </p>
        )}
        <AuthField
          id="correo"
          label="Correo electrónico"
          type="email"
          value={correo}
          onChange={(event) => setCorreo(event.target.value)}
          autoComplete="email"
          maxLength={254}
        />
        <AuthField
          id="password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          maxLength={72}
        />
        {error && (
          <div className="inline-alert" role="alert">
            <Icon name="warning" size={17} />
            <span>{error}</span>
          </div>
        )}
        <button className="button button--primary auth-submit" type="submit" disabled={busy}>
          {busy ? 'Verificando…' : 'Entrar al sistema'}
          <Icon name="arrow" size={17} />
        </button>
      </form>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register({ nombre, correo, password });
      navigate('/login', { replace: true, state: { correo, registrationComplete: true } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Crear cuenta"
      description="Registrá el acceso que vas a usar en el minimercado."
      footer={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login">
            Iniciar sesión <Icon name="arrow" size={14} />
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <AuthField
          id="nombre"
          label="Nombre"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          autoComplete="name"
          maxLength={150}
        />
        <AuthField
          id="correo"
          label="Correo electrónico"
          type="email"
          value={correo}
          onChange={(event) => setCorreo(event.target.value)}
          autoComplete="email"
          maxLength={254}
        />
        <AuthField
          id="password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
        />
        <p className="field-help">Usá al menos 8 caracteres.</p>
        {error && (
          <div className="inline-alert" role="alert">
            <Icon name="warning" size={17} />
            <span>{error}</span>
          </div>
        )}
        <button className="button button--primary auth-submit" type="submit" disabled={busy}>
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
          <Icon name="arrow" size={17} />
        </button>
      </form>
    </AuthFrame>
  );
}
