import { useMemo } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import { Brand } from './components/Brand.jsx';
import AssistantChat from './components/AssistantChat.jsx';
import CommandSearch from './components/CommandSearch.jsx';
import { Icon } from './components/Icon.jsx';
import ResourcePage from './components/ResourcePage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import { moduleNavigation, resourcesByKey } from './data/resources.js';

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

function AppShell() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const currentResource = useMemo(() => Object.values(resourcesByKey).find((resource) => location.pathname === `/${resource.route}` || (location.pathname === '/caja' && resource.key === 'facturas')), [location.pathname]);

  function isModuleActive(item) {
    if (item.key === 'home') return location.pathname === '/';
    return currentResource?.group === item.group || item.activeGroups?.includes(currentResource?.group);
  }

  return <div className="app-shell">
    <div className="app-main">
      <header className="topbar">
        <div className="topbar-brand"><Brand /></div>
        <nav className="primary-nav" aria-label="Navegación principal">
          {moduleNavigation.map((item) => {
            const active = isModuleActive(item);
            return <Link key={item.key} to={item.route} className={`primary-nav-link${active ? ' primary-nav-link--active' : ''}`} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
          })}
        </nav>
        <div className="topbar-right">
          <div className="topbar-search"><CommandSearch /></div>
          <div className="topbar-tools">
            <span className="account-chip" title={usuario?.nombre}>{usuario?.nombre || 'Cuenta'}</span>
            <button className="logout-button" type="button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><Icon name="logout" size={17} /><span>Salir</span></button>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="app-footer"><span>LA ESQUINA</span><span>Escenario académico</span></footer>
    </div>
    <AssistantChat />
  </div>;
}

function App() {
  return <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<OperationsPage />} />
            {Object.values(resourcesByKey).map((resource) => <Route key={resource.key} path={resource.route} element={<ResourcePage resourceKey={resource.key} />} />)}
            <Route path="caja" element={<ResourcePage resourceKey="facturas" initialMode="create" />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>;
}

export default App;
