import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createApiClient, checkApiHealth } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatDate, formatMoney, formatQuantity } from '../data/resources.js';
import { Icon } from '../components/Icon.jsx';

function queueItems({ invoices, purchases, returns, stock }) {
  return [
    ...invoices.filter((item) => item.estado === 'borrador').map((item) => ({
      key: `invoice-${item.id}`,
      type: 'Venta',
      title: `Factura #${item.id} · ${item.cliente?.nombre || (item.clienteId ? `Cliente #${item.clienteId}` : 'Consumidor Final / Mostrador')}`,
      detail: item.detalles?.length ? 'Revisá los productos y confirmá la venta.' : 'Agregá productos para completar la factura.',
      meta: `${formatDate(item.fecha)} · ${formatMoney(item.total)}`,
      to: '/ventas/facturas',
      action: 'Abrir factura'
    })),
    ...purchases.filter((item) => item.estado === 'borrador').map((item) => ({
      key: `purchase-${item.id}`,
      type: 'Compra',
      title: `Compra #${item.id} · ${item.proveedor?.nombre || `Proveedor #${item.proveedorId}`}`,
      detail: item.detalles?.length ? 'Revisá las líneas y registrá la recepción.' : 'Agregá productos antes de recibir la compra.',
      meta: `${formatDate(item.fecha)} · ${formatMoney(item.total)}`,
      to: '/abastecimiento/compras',
      action: 'Abrir compra'
    })),
    ...returns.filter((item) => item.estado === 'borrador').map((item) => ({
      key: `return-${item.id}`,
      type: 'Devolución',
      title: `Devolución #${item.id} · Factura #${item.facturaId}`,
      detail: item.detalles?.length ? 'Revisá los productos y procesá la devolución.' : 'Agregá los productos devueltos.',
      meta: `${formatDate(item.fecha)} · ${item.motivo}`,
      to: '/devoluciones',
      action: 'Abrir devolución'
    })),
    ...stock.filter((item) => item.requiereReposicion).map((item) => ({
      key: `stock-${item.id}`,
      type: 'Inventario',
      title: item.producto?.nombre || `Producto #${item.productoId}`,
      detail: `Quedan ${formatQuantity(item.cantidadActual)} ${item.producto?.unidadMedida?.abreviatura || ''}; el mínimo es ${formatQuantity(item.cantidadMinima)}.`,
      meta: item.producto?.sku || `Existencia #${item.id}`,
      to: '/inventario/existencias',
      action: 'Revisar stock'
    }))
  ];
}

function QueueTable({ items }) {
  return <div className="queue-table-wrap"><table className="queue-table">
    <caption className="visually-hidden">Registros que necesitan seguimiento</caption>
    <thead><tr><th>Tipo</th><th>Registro</th><th>Qué falta</th><th>Referencia</th><th><span className="visually-hidden">Abrir registro</span></th></tr></thead>
    <tbody>{items.map((item) => <tr key={item.key}>
      <td><span className="queue-type">{item.type}</span></td>
      <td className="queue-title-cell">{item.title}</td>
      <td className="queue-detail-cell">{item.detail}</td>
      <td className="queue-meta-cell">{item.meta}</td>
      <td><Link className="queue-link" to={item.to}>{item.action}<Icon name="arrow" size={16} /></Link></td>
    </tr>)}</tbody>
  </table></div>;
}

function dayInCostaRica(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value));
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
}

function amountInCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export default function OperationsPage() {
  const { token, logout } = useAuth();
  const api = useMemo(() => createApiClient(token, logout), [token, logout]);
  const [data, setData] = useState({ invoices: [], purchases: [], returns: [], stock: [], movements: [], products: [], clients: [], paymentMethods: [] });
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [apiState, setApiState] = useState('checking');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setState('loading');
    setError('');
    try {
      const [invoices, purchases, returns, stock, movements, products, clients, paymentMethods] = await Promise.all([
        api.facturas.listar(),
        api.compras.listar(),
        api.devoluciones.listar(),
        api.existencias.listar(),
        api['movimientos-inventario'].listar(),
        api.productos.listar(),
        api.clientes.listar(),
        api['metodos-pago'].listar()
      ]);
      setData({ invoices, purchases, returns, stock, movements, products, clients, paymentMethods });
      setState('ready');
    } catch (requestError) {
      setError(requestError.message);
      setState('error');
    } finally {
      setRefreshing(false);
    }
    try {
      await checkApiHealth();
      setApiState('online');
    } catch {
      setApiState('offline');
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const queue = useMemo(() => queueItems(data), [data]);
  const recent = [...data.movements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  const dayLabel = new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const todayKey = dayInCostaRica(new Date());
  const invoicesToday = data.invoices.filter((invoice) => invoice.estado === 'confirmada' && dayInCostaRica(invoice.fechaConfirmacion) === todayKey);
  const salesToday = invoicesToday.reduce((sum, invoice) => sum + amountInCents(invoice.total), 0);
  const paymentMethodNames = new Map(data.paymentMethods.map((method) => [method.id, method.nombre]));
  const paymentBreakdown = invoicesToday.flatMap((invoice) => invoice.pagos || []).reduce((totals, payment) => {
    const methodName = paymentMethodNames.get(payment.metodoPagoId) || `Método #${payment.metodoPagoId}`;
    const current = totals.get(methodName) || 0;
    totals.set(methodName, current + amountInCents(payment.monto));
    return totals;
  }, new Map());
  const stockAlerts = data.stock.filter((item) => item.requiereReposicion);

  return <main className="page-content operations-page">
    <section className="control-center" aria-labelledby="control-center-title">
      <div className="control-center-main">
        <div className="control-center-copy">
          <p className="eyebrow">Centro de Control</p>
          <h1 id="control-center-title">Consola de Administración <span>· La Esquina</span></h1>
          <p>Revisá la tienda y abrí una venta desde aquí.</p>
        </div>
        <Link className="button button--primary control-center-action" to="/caja"><Icon name="sparkles" size={17} />Cobro Rápido / Nueva Venta<Icon name="arrow" size={17} /></Link>
      </div>
      {state === 'ready' && data.products.length === 0 && <section className="onboarding-guide" aria-labelledby="onboarding-title">
        <div className="onboarding-heading"><div><p className="eyebrow">Primera configuración</p><h2 id="onboarding-title">Guía de Inicio Rápido</h2></div><p>Seguí estos pasos para empezar a registrar ventas.</p></div>
        <ol className="onboarding-steps">
          <li><span className="onboarding-step-number">1</span><div><h3>Categorías y Unidades</h3><p>Organizá los productos y sus medidas.</p></div><Link className="button button--quiet" to="/catalogo/categorias">Configurar</Link></li>
          <li><span className="onboarding-step-number">2</span><div><h3>Cargar Stock Inicial</h3><p>Agregá productos y registrá su existencia.</p></div><Link className="button button--quiet" to="/catalogo/productos">Agregar Producto</Link></li>
          <li><span className="onboarding-step-number">3</span><div><h3>Facturación y Caja</h3><p>Prepará una venta de prueba.</p></div><Link className="button button--quiet" to="/caja">Probar Venta</Link></li>
        </ol>
      </section>}
    </section>

    <div className="operations-head">
      <div>
        <p className="operations-date">Operación diaria · {dayLabel}</p>
        <h2>Pendientes del día</h2>
        <p className="page-subtitle">Revisá ventas, compras e inventario que necesitan seguimiento.</p>
      </div>
      <div className="operations-tools">
        <span className={`connection-status connection-status--${apiState}`}><i />{apiState === 'online' ? 'Conectada' : apiState === 'offline' ? 'Sin conexión' : 'Conectando'}</span>
        <button className="button button--quiet refresh-button" type="button" onClick={() => load(true)} disabled={refreshing || state === 'loading'}>
          <Icon name="refresh" size={17} />{refreshing ? 'Actualizando' : 'Actualizar'}
        </button>
      </div>
    </div>

    {error && <div className="inline-alert" role="alert"><Icon name="warning" size={18} /><span>{error}</span><button className="text-action" type="button" onClick={() => load(true)}>Reintentar</button></div>}

    <section className="metrics-ticker" aria-label="Indicadores de operación de hoy">
      <article className="metric-card metric-card--sales">
        <div className="metric-card-heading"><span>Total ventas hoy</span><span className="metric-icon"><Icon name="receipt" size={17} /></span></div>
        <strong className="metric-value metric-value--money">{state === 'ready' ? formatMoney(salesToday / 100) : '—'}</strong>
        <p>{state === 'ready' ? `Suma de ${invoicesToday.length} facturas confirmadas.` : state === 'error' ? 'No se pudieron consultar las ventas.' : 'Cargando ventas confirmadas…'}</p>
      </article>
      <article className="metric-card">
        <div className="metric-card-heading"><span>Facturas emitidas hoy</span><span className="metric-icon"><Icon name="record" size={17} /></span></div>
        <strong className="metric-value">{state === 'ready' ? invoicesToday.length.toLocaleString('es-CR') : '—'}</strong>
        <div className="payment-method-breakdown" aria-label="Desglose de pagos por método">
          {state === 'error' ? <span className="metric-note">No se pudo consultar el desglose.</span> : state !== 'ready' ? <span className="metric-note">Cargando pagos…</span> : paymentBreakdown.size ? [...paymentBreakdown.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, cents]) => <span key={name}><small>{name}</small><strong>{formatMoney(cents / 100)}</strong></span>) : <span className="metric-note">Sin pagos aplicados a las facturas de hoy.</span>}
        </div>
      </article>
      <article className={`metric-card metric-card--warning${state === 'ready' && stockAlerts.length ? ' metric-card--has-alerts' : ''}`}>
        <div className="metric-card-heading"><span>Alertas de stock crítico</span><span className="metric-icon"><Icon name="warning" size={17} /></span></div>
        <div className="stock-alert-value"><strong className="metric-value">{state === 'ready' ? stockAlerts.length.toLocaleString('es-CR') : '—'}</strong><span className={`metric-badge${state === 'ready' && stockAlerts.length ? '' : ' metric-badge--neutral'}`}>{state === 'error' ? 'No disponible' : state === 'ready' && stockAlerts.length ? 'Reposición inmediata' : state === 'ready' ? 'En rango' : 'Cargando'}</span></div>
        <p>{state === 'ready' && stockAlerts.length ? stockAlerts.slice(0, 2).map((item) => item.producto?.nombre || `Producto #${item.productoId}`).join(' · ') : state === 'ready' ? 'No hay productos bajo el mínimo configurado.' : state === 'error' ? 'No se pudieron consultar las existencias.' : 'Cargando existencias…'}</p>
        <Link className="metric-link" to="/inventario/existencias">Revisar existencias<Icon name="arrow" size={14} /></Link>
      </article>
    </section>

    <div className="operations-grid">
      <section className="work-queue" aria-labelledby="queue-title">
        <div className="section-heading"><div><h2 id="queue-title">Por resolver</h2><p>Documentos en borrador y productos bajo su mínimo.</p></div></div>
        {state === 'loading' && <div className="list-state"><span className="loading-mark" /><p>Consultando ventas, compras e inventario…</p></div>}
        {state === 'ready' && queue.length > 0 && <QueueTable items={queue.slice(0, 12)} />}
        {state === 'ready' && queue.length === 0 && data.products.length > 0 && <div className="queue-empty">
          <div><h3>{data.products.length === 0 ? 'El catálogo todavía está vacío.' : 'No hay tareas pendientes.'}</h3>
            <p>{data.products.length === 0 ? 'Registrá categorías, unidades y productos para empezar a vender.' : 'Podés iniciar una venta o registrar una compra.'}</p>
          </div>
          <div className="empty-actions">
            {data.products.length === 0 && <Link className="button button--quiet" to="/catalogo/categorias">Crear categoría</Link>}
            {data.products.length === 0 && <Link className="button button--quiet" to="/catalogo/unidades-medida">Crear unidad</Link>}
            <Link className="button button--primary" to={data.products.length === 0 ? '/catalogo/productos' : '/ventas/facturas'}>{data.products.length === 0 ? 'Crear producto' : 'Iniciar una venta'}<Icon name="arrow" size={16} /></Link>
            {data.clients.length === 0 && <Link className="empty-secondary-link" to="/clientes">Registrar cliente</Link>}
          </div>
        </div>}
        {state === 'ready' && queue.length > 12 && <p className="queue-overflow">Se muestran 12 pendientes. Abrí cada módulo para ver el resto.</p>}
      </section>

      <aside className="quick-panel" aria-labelledby="quick-title">
        <h2 id="quick-title">Crear un registro</h2>
        <div className="quick-links">
          <Link to="/ventas/facturas"><span><strong>Iniciar una venta</strong><small>Crear una factura</small></span><Icon name="arrow" size={17} /></Link>
          <Link to="/abastecimiento/compras"><span><strong>Registrar una compra</strong><small>Preparar recepción de productos</small></span><Icon name="arrow" size={17} /></Link>
          <Link to="/catalogo/productos"><span><strong>Agregar un producto</strong><small>Incorporar al catálogo</small></span><Icon name="arrow" size={17} /></Link>
          <Link to="/clientes"><span><strong>Registrar un cliente</strong><small>Vincular una persona con ventas</small></span><Icon name="arrow" size={17} /></Link>
        </div>
      </aside>
    </div>

    <section className="movement-section" aria-labelledby="movement-title">
      <div className="section-heading"><div><h2 id="movement-title">Movimientos recientes</h2></div><Link className="section-link" to="/inventario/movimientos">Ver historial <Icon name="arrow" size={15} /></Link></div>
      {state === 'ready' && recent.length === 0 && <p className="movement-empty">Todavía no hay movimientos registrados.</p>}
      {state === 'ready' && recent.length > 0 && <div className="movement-table-wrap"><table className="movement-table">
        <thead><tr><th>Fecha</th><th>Movimiento</th><th>Producto</th><th>Cantidad</th><th>Motivo</th></tr></thead>
        <tbody>{recent.map((movement) => <tr key={movement.id}><td className="tabular-text">{formatDate(movement.createdAt, true)}</td><td><span className={`movement-mark movement-mark--${movement.tipo}`}>{movement.tipo}</span></td><td>{movement.producto?.nombre || `Producto #${movement.productoId}`}</td><td className="numeric-cell">{movement.tipo === 'salida' ? '−' : movement.tipo === 'entrada' || movement.tipo === 'devolucion' ? '+' : ''}{formatQuantity(movement.cantidad)}</td><td className="muted-cell">{movement.nota || 'Sin dato'}</td></tr>)}</tbody>
      </table></div>}
    </section>
  </main>;
}
