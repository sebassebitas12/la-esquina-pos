import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { createApiClient } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatDate, formatMoney, formatQuantity, resources, resourcesByKey, statusLabels } from '../data/resources.js';
import { Icon } from './Icon.jsx';

const relatedName = {
  clienteId: 'cliente', productoId: 'producto', facturaId: 'factura', compraId: 'compra', proveedorId: 'proveedor',
  categoriaId: 'categoria', marcaId: 'marca', unidadMedidaId: 'unidadMedida', metodoPagoId: 'metodoPago',
  devolucionId: 'devolucion', detalleFacturaId: 'detalleFactura', usuarioId: 'usuario'
};

const actionLabels = {
  recibir: { label: 'Registrar recepción', title: 'Recibir esta compra', message: 'Se sumarán las cantidades de sus líneas al inventario y la compra quedará recibida.' },
  confirmar: { label: 'Confirmar venta', title: 'Confirmar esta factura', message: 'Se descontarán del inventario las cantidades de sus líneas. Esta acción cierra el borrador de venta.' },
  anular: { label: 'Anular documento', title: 'Anular este documento', message: 'El documento quedará anulado y se conservará en el historial.' },
  procesar: { label: 'Procesar devolución', title: 'Procesar esta devolución', message: 'Las cantidades devueltas volverán al inventario y el documento quedará procesado.' }
};

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function createValues(resource) {
  return Object.fromEntries(resource.fields.map((item) => [item.name, item.defaultToday ? today() : item.defaultValue ?? '']));
}

function editValues(resource, record) {
  return Object.fromEntries(resource.fields.map((item) => {
    const value = record[item.name];
    return [item.name, value === null || value === undefined ? (item.type === 'boolean' ? false : '') : String(value)];
  }));
}

function buildPayload(resource, values) {
  return resource.fields.reduce((payload, item) => {
    const value = values[item.name];
    if (item.type === 'boolean') payload[item.name] = Boolean(value);
    else if (item.type === 'select') {
      if (value === '' && item.nullable) payload[item.name] = null;
      else if (value !== '') payload[item.name] = Number(value);
    } else if (['money', 'decimal', 'integer'].includes(item.type)) {
      if (value !== '') payload[item.name] = Number(value);
    } else if (['email', 'tel'].includes(item.type) && !String(value).trim()) payload[item.name] = null;
    else if (item.type !== 'date') payload[item.name] = String(value).trim() || null;
    else if (value) payload[item.name] = value;
    return payload;
  }, {});
}

function optionLabel(name, option) {
  if (name === 'clientes') return `${option.nombre} · #${option.id}`;
  if (name === 'productos') return `${option.nombre} · ${option.sku || `#${option.id}`}`;
  if (name === 'proveedores') return `${option.nombre} · #${option.id}`;
  if (name === 'categorias' || name === 'marcas' || name === 'unidades-medida' || name === 'metodos-pago') return option.nombre || `${option.abreviatura} · #${option.id}`;
  if (name === 'facturas') return `Factura #${option.id} · ${option.cliente?.nombre || (option.clienteId ? `Cliente #${option.clienteId}` : 'Consumidor Final / Mostrador')} · ${formatDate(option.fecha)}`;
  if (name === 'compras') return `Compra #${option.id} · ${option.proveedor?.nombre || `Proveedor #${option.proveedorId}`} · ${option.estado}`;
  if (name === 'devoluciones') return `Devolución #${option.id} · factura #${option.facturaId}`;
  if (name === 'detalles-factura') return `${option.producto?.nombre || `Producto #${option.productoId}`} · factura #${option.facturaId} · ${formatQuantity(option.cantidad)}`;
  return `${option.nombre || option.producto?.nombre || 'Registro'} · #${option.id}`;
}

function optionsFor(item, options, values) {
  let list = options[item.optionsKey] || [];
  if (item.optionFilter === 'drafts') list = list.filter((record) => record.estado === 'borrador');
  if (item.optionFilter === 'confirmed') list = list.filter((record) => record.estado === 'confirmada');
  if (item.optionsKey === 'detalles-factura' && values.devolucionId) {
    const selectedReturn = options.devoluciones?.find((entry) => String(entry.id) === String(values.devolucionId));
    if (selectedReturn) list = list.filter((line) => String(line.facturaId) === String(selectedReturn.facturaId));
  }
  return list;
}

function FieldControl({ resource, field, value, onChange, options, busy }) {
  const id = `field-${resource.key}-${field.name}`;
  const relationOptions = field.optionsKey ? optionsFor(field, options, options.formValues || {}) : [];
  const noOptions = field.optionsKey && relationOptions.length === 0 && !field.nullable;
  const relatedResource = field.optionsKey ? Object.values(resourcesByKey).find((item) => item.key === field.optionsKey) : null;

  return (
    <div className={`form-field${field.type === 'boolean' ? ' form-field--toggle' : ''}${field.type === 'textarea' ? ' form-field--wide' : ''}`}>
      {field.type === 'boolean' ? <>
        <label htmlFor={id}><span>{field.label}</span><small>{value ? 'Sí' : 'No'}</small></label>
        <input id={id} name={field.name} type="checkbox" checked={Boolean(value)} onChange={onChange} disabled={busy} />
      </> : <>
        <label htmlFor={id}>{field.label}{field.required && <span className="required-mark">*</span>}</label>
        {field.optionsKey ? <select id={id} name={field.name} value={value} onChange={onChange} required={field.required} disabled={busy || (noOptions && !field.nullable)}>
          <option value="">{field.nullable ? field.emptyLabel || 'Sin asignar' : noOptions ? 'No hay registros disponibles' : 'Seleccioná un registro'}</option>
          {relationOptions.map((option) => <option key={option.id} value={option.id}>{optionLabel(field.optionsKey, option)}</option>)}
        </select> : field.values ? <select id={id} name={field.name} value={value} onChange={onChange} required={field.required} disabled={busy}>
          <option value="">Seleccioná una opción</option>{field.values.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select> : field.type === 'textarea' ? <textarea id={id} name={field.name} value={value} onChange={onChange} required={field.required} maxLength={field.maxLength} rows={3} disabled={busy} /> : <input
          id={id} name={field.name} type={['money', 'decimal', 'integer'].includes(field.type) ? 'number' : field.type}
          value={value} onChange={onChange} required={field.required} maxLength={field.maxLength} min={field.min} step={field.step}
          inputMode={['money', 'decimal'].includes(field.type) ? 'decimal' : undefined} disabled={busy}
        />}
        {field.help && <p className="field-help">{field.help}</p>}
        {noOptions && relatedResource && <p className="field-help">Primero <Link to={`/${relatedResource.route}`}>creá {relatedResource.singular}</Link> para poder continuar.</p>}
      </>}
    </div>
  );
}

function RecordForm({ resource, mode, record, options, onCancel, onSave }) {
  const [values, setValues] = useState(() => mode === 'edit' ? editValues(resource, record) : createValues(resource));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const currentOptions = { ...options, formValues: values };

  function change(event) {
    const { name, value, type, checked } = event.target;
    setValues((old) => {
      const next = { ...old, [name]: type === 'checkbox' ? checked : value };
      if (name === 'productoId' && resource.key === 'detalles-factura') {
        const product = options.productos?.find((item) => String(item.id) === value);
        if (product) next.precioUnitario = String(product.precio);
      }
      if (name === 'devolucionId') next.detalleFacturaId = '';
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(buildPayload(resource, values));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <form className="record-form" onSubmit={submit}>
    <div className="form-fields">{resource.fields.map((item) => <FieldControl key={item.name} resource={resource} field={item} value={values[item.name]} onChange={change} options={currentOptions} busy={busy} />)}</div>
    {error && <div className="inline-alert" role="alert"><Icon name="warning" size={17} /><span>{error}</span></div>}
    <div className="form-actions"><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Guardar'}</button><button className="button button--ghost" type="button" onClick={onCancel} disabled={busy}>Cancelar</button></div>
  </form>;
}

function canEdit(resource, record) {
  if (resource.update === false) return false;
  if (resource.key === 'compras' || resource.key === 'facturas' || resource.key === 'devoluciones') return record.estado === 'borrador';
  if (resource.key === 'detalles-compra') return record.compra?.estado === 'borrador';
  if (resource.key === 'detalles-factura') return record.factura?.estado === 'borrador';
  if (resource.key === 'detalles-devolucion') return record.devolucion?.estado === 'borrador';
  return true;
}

function canDelete(resource, record) {
  if (resource.delete === false) return false;
  if (['compras', 'facturas', 'devoluciones'].includes(resource.key)) return record.estado === 'borrador';
  if (resource.key === 'detalles-compra') return record.compra?.estado === 'borrador';
  if (resource.key === 'detalles-factura') return record.factura?.estado === 'borrador';
  if (resource.key === 'detalles-devolucion') return record.devolucion?.estado === 'borrador';
  return true;
}

function Status({ value }) {
  const tone = ['borrador', 'anulada', 'anulado'].includes(value) ? 'quiet' : ['recibida', 'confirmada', 'procesada', 'activo', 'activa'].includes(value) ? 'good' : 'warn';
  return <span className={`status-pill status-pill--${tone}`}><i />{statusLabels[value] || value || 'Sin dato'}</span>;
}

function ModuleTabs({ resource }) {
  const tabs = resources.filter((item) => item.group === resource.group);
  if (tabs.length < 2) return null;
  return <nav className="module-tabs" aria-label={`Secciones de ${resource.group}`}>
    {tabs.map((item) => <NavLink key={item.key} to={`/${item.route}`} className={({ isActive }) => `module-tab${isActive ? ' module-tab--active' : ''}`}>{item.title}</NavLink>)}
  </nav>;
}

function CellValue({ column, record }) {
  const value = column.value(record);
  if (column.kind === 'status') return <Status value={record.estado || (record.activa === false || record.activo === false ? 'inactiva' : record.activa === true || record.activo === true ? 'activa' : value.toLowerCase())} />;
  return <span className={`${column.kind === 'numeric' || column.kind === 'money' ? 'numeric-cell' : ''} ${column.kind === 'primary' ? 'primary-value' : ''}`}>{value}</span>;
}

function displayValue(item, record, resource) {
  if (resource.key === 'facturas' && item.name === 'clienteId' && !record.clienteId) return 'Consumidor Final / Mostrador';
  const relation = relatedName[item.name];
  if (relation && record[relation]) {
    const linked = record[relation];
    if (relation === 'detalleFactura') return `${linked.producto?.nombre || `Producto #${linked.productoId}`} · factura #${linked.facturaId}`;
    if (relation === 'unidadMedida') return `${linked.nombre} (${linked.abreviatura})`;
    return linked.nombre || `${relation} #${linked.id}`;
  }
  const value = record[item.name];
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (item.type === 'money') return formatMoney(value);
  if (item.type === 'decimal' || item.type === 'integer') return formatQuantity(value);
  if (item.type === 'date') return formatDate(value, record.fecha === value && value.includes('T'));
  if (item.type === 'boolean') return value ? 'Sí' : 'No';
  if (item.name === 'estado') return statusLabels[value] || value;
  return String(value);
}

function RecordInspector({ resource, record, mode, options, onClose, onEdit, onDelete, onSave, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const title = mode === 'view' ? (record.nombre || `${resource.singular} #${record.id}`) : mode === 'edit' ? `Editar ${resource.singular}` : resource.createLabel || `Nuevo ${resource.singular}`;
  useEffect(() => {
    const previousFocus = document.activeElement;
    const focusable = () => [...(panelRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]') || [])];
    focusable()[0]?.focus();
    function handleKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [mode]);
  return <div className="record-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} className="record-dialog" aria-labelledby="record-dialog-title" role="dialog" aria-modal="true">
      <div className="record-dialog-heading"><div><p className="eyebrow">{mode === 'create' ? 'NUEVO REGISTRO' : `REGISTRO #${record?.id}`}</p><h2 id="record-dialog-title">{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button></div>
      {mode === 'view' ? <div className="record-detail">
        <div className="detail-topline"><span>{resource.title}</span>{record.estado && <Status value={record.estado} />}</div>
        <dl className="detail-list">{resource.fields.map((item) => <div key={item.name}><dt>{item.label}</dt><dd>{displayValue(item, record, resource)}</dd></div>)}</dl>
        {Array.isArray(record.detalles) && <section className="detail-related"><h3>Líneas asociadas <span>{record.detalles.length}</span></h3>{record.detalles.length ? record.detalles.map((line) => <div className="related-line" key={line.id}><span>{line.producto?.nombre || line.detalleFactura?.producto?.nombre || `Línea #${line.id}`} <small>× {formatQuantity(line.cantidad)}</small></span><strong>{formatMoney(line.precioUnitario ?? line.costoUnitario)}</strong></div>) : <p>Este documento todavía no tiene líneas.</p>}</section>}
        <div className="detail-actions">{canEdit(resource, record) && <button className="button button--outline" type="button" onClick={onEdit}><Icon name="edit" size={16} />Editar</button>}{canDelete(resource, record) && <button className="button button--danger-ghost" type="button" onClick={onDelete}><Icon name="trash" size={16} />{resource.deleteLabel || (resource.key === 'pagos' ? 'Anular pago' : 'Eliminar')}</button>}</div>
      </div> : children || <RecordForm key={`${resource.key}-${mode}-${record?.id || 'new'}`} resource={resource} mode={mode} record={record} options={options} onCancel={onClose} onSave={onSave} />}
    </section>
  </div>;
}

function ConfirmDialog({ target, busy, error, onCancel, onConfirm }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (target && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!target && dialog.current?.open) dialog.current.close();
  }, [target]);
  if (!target) return <dialog ref={dialog} className="confirm-dialog" />;
  const isDelete = target.kind === 'delete';
  const isPaymentReversal = isDelete && target.resource.key === 'pagos';
  const action = actionLabels[target.kind];
  return <dialog className="confirm-dialog" ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <p className="eyebrow">{isDelete ? (isPaymentReversal ? 'CONFIRMAR ANULACIÓN' : 'CONFIRMAR ELIMINACIÓN') : 'CONFIRMAR OPERACIÓN'}</p>
    <h2>{isDelete ? isPaymentReversal ? `Anular pago #${target.record.id}` : `Eliminar ${target.resource.singular}` : action.title}</h2>
    <p>{isPaymentReversal ? <>El pago de {formatMoney(target.record.monto)} dejará de cubrir el saldo de la factura y quedará en el historial como anulado.</> : isDelete ? <>¿Querés eliminar <strong>{target.record.nombre || `${target.resource.singular} #${target.record.id}`}</strong>? Esta acción no se puede deshacer.</> : action.message}</p>
    {error && <div className="inline-alert" role="alert"><Icon name="warning" size={17} /><span>{error}</span></div>}
    <div className="dialog-actions"><button className="button button--ghost" type="button" onClick={onCancel} disabled={busy}>Volver</button><button className={isDelete && !isPaymentReversal ? 'button button--danger' : 'button button--primary'} type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Procesando…' : isDelete ? target.resource.deleteLabel || (isPaymentReversal ? 'Anular pago' : 'Eliminar registro') : action.label}</button></div>
  </dialog>;
}

export default function ResourcePage({ resourceKey, initialMode }) {
  const location = useLocation();
  const resource = resourcesByKey[resourceKey];
  const { token, logout } = useAuth();
  const api = useMemo(() => createApiClient(token, logout), [token, logout]);
  const [records, setRecords] = useState([]);
  const [options, setOptions] = useState({});
  const [listState, setListState] = useState('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [panel, setPanel] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setListState('loading');
    setError('');
    try {
      const rows = await api[resourceKey].listar();
      setRecords(rows);
      setListState('ready');
    } catch (requestError) {
      setError(requestError.message);
      setListState('error');
      return;
    }
    const keys = [...new Set(resource.fields.map((item) => item.optionsKey).filter(Boolean))];
    if (keys.length) {
      const responses = await Promise.allSettled(keys.map((key) => api[key].listar()));
      const resolved = {};
      responses.forEach((response, index) => { if (response.status === 'fulfilled') resolved[keys[index]] = response.value; });
      setOptions(resolved);
    } else setOptions({});
  }, [api, resource, resourceKey]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setPanel(null);
    setConfirm(null);
    setConfirmError('');
  }, [location.pathname, resourceKey]);
  useEffect(() => {
    if (initialMode === 'create') setPanel({ mode: 'create', record: null });
  }, [initialMode]);

  const visibleRecords = useMemo(() => records.filter((record) => {
    const matchesQuery = !query.trim() || resource.search(record).toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = !filter || record.estado === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query, records, resource]);

  function openPanel(mode, record = null) {
    setPanel({ mode, record });
  }

  async function saveRecord(payload) {
    if (panel.mode === 'edit') await api[resourceKey].actualizar(panel.record.id, payload);
    else await api[resourceKey].crear(payload);
    setPanel(null);
    setNotice(panel.mode === 'edit' ? 'Cambios guardados.' : `${resource.singular} creado.`);
    await load();
  }

  async function executeConfirmed() {
    setBusy(true);
    setConfirmError('');
    try {
      if (confirm.kind === 'delete') await api[resourceKey].eliminar(confirm.record.id);
      else await api[resourceKey].accion(confirm.record.id, confirm.kind === 'confirmar' ? 'confirmar' : confirm.kind === 'recibir' ? 'recibir' : confirm.kind === 'procesar' ? 'procesar' : 'anular');
      setConfirm(null);
      setPanel(null);
      setNotice(confirm.kind === 'delete' ? 'Registro eliminado.' : `${actionLabels[confirm.kind].label} completado.`);
      await load();
    } catch (requestError) {
      setConfirmError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function askAction(kind, record) {
    setConfirmError('');
    setConfirm({ kind, record, resource });
  }

  function rowActions(record) {
    return <div className="row-actions">
      <button className="row-action" type="button" onClick={() => openPanel('view', record)}><Icon name="eye" size={15} />Ver</button>
      {canEdit(resource, record) && <button className="row-action" type="button" onClick={() => openPanel('edit', record)}><Icon name="edit" size={15} />Editar</button>}
      {canDelete(resource, record) && <button className="row-action row-action--danger" type="button" onClick={() => askAction('delete', record)}><Icon name="trash" size={15} />{resource.deleteLabel || (resource.key === 'pagos' ? 'Anular pago' : 'Eliminar')}</button>}
      {resource.actions?.map((action) => {
        const allowed = action === 'recibir' ? record.estado === 'borrador' : action === 'confirmar' ? record.estado === 'borrador' : action === 'procesar' ? record.estado === 'borrador' : action === 'anular' && (resource.key === 'compras' ? record.estado === 'borrador' : record.estado === 'confirmada');
        if (!allowed) return null;
        const kind = action === 'recibir' ? 'recibir' : action === 'confirmar' ? 'confirmar' : action === 'procesar' ? 'procesar' : 'anular';
        return <button className="row-action row-action--accent" type="button" key={action} onClick={() => askAction(kind, record)}>{actionLabels[kind].label}</button>;
      })}
    </div>;
  }

  return <main className="page-content resource-page">
    <div className="resource-heading">
      <div><p className="eyebrow">{resource.group}</p><h1>{resource.title}</h1><p className="page-subtitle">{resource.description}</p></div>
      {resource.create !== false && <button className="button button--primary create-button" type="button" aria-label={`Crear ${resource.singular}`} onClick={() => openPanel('create')}><Icon name="plus" size={17} /><span>Crear <span className="create-button-full">{resource.singular}</span></span></button>}
    </div>

    <ModuleTabs resource={resource} />

    <div className="resource-toolbar">
      <label className="search-box"><Icon name="search" size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${resource.title.toLowerCase()}…`} aria-label={`Buscar ${resource.title.toLowerCase()}`} /></label>
      {resource.filters?.length > 0 && <div className="filter-tabs" aria-label="Filtrar registros"><button className={!filter ? 'filter-tab filter-tab--active' : 'filter-tab'} type="button" onClick={() => setFilter('')}>Todos</button>{resource.filters.map((item) => <button key={item.value} className={filter === item.value ? 'filter-tab filter-tab--active' : 'filter-tab'} type="button" onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>}
      <div className="toolbar-count">{listState === 'ready' ? <><strong>{visibleRecords.length}</strong><span>de {records.length} registros</span></> : <span>{listState === 'error' ? 'Error de carga' : 'Cargando…'}</span>}<button type="button" onClick={load} aria-label="Actualizar lista" title="Actualizar lista"><Icon name="refresh" size={16} /></button></div>
    </div>

    {notice && <div className="success-notice" role="status"><Icon name="check" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso"><Icon name="close" size={15} /></button></div>}
    {error && <div className="inline-alert" role="alert"><Icon name="warning" size={18} /><span>{error}</span><button className="text-action" type="button" onClick={load}>Reintentar</button></div>}

    {listState === 'loading' && <div className="list-state"><span className="loading-mark" /><p>Consultando {resource.title.toLowerCase()}…</p></div>}
    {listState === 'ready' && visibleRecords.length === 0 && <div className="empty-state">
      <div><h2>{records.length === 0 ? `Todavía no hay ${resource.title.toLowerCase()}.` : 'No hay coincidencias.'}</h2><p>{records.length === 0 ? resource.emptyDescription || `Creá el primer registro para empezar a trabajar con ${resource.title.toLowerCase()}.` : 'Probá otra búsqueda o quitá el filtro actual.'}</p>
        {records.length === 0 && resource.emptyLinks?.length > 0 && <div className="empty-links">{resource.emptyLinks.map((item) => <Link className="button button--quiet" key={item.to} to={item.to}>{item.label}<Icon name="arrow" size={15} /></Link>)}</div>}
      </div>
      {records.length === 0 && resource.create !== false && <button className="button button--outline" type="button" onClick={() => openPanel('create')}>Crear {resource.singular}<Icon name="arrow" size={16} /></button>}
    </div>}
    {listState === 'ready' && visibleRecords.length > 0 && <>
      <div className="records-table-wrap"><table className="records-table"><caption className="visually-hidden">Registros de {resource.title}</caption>
        <thead><tr>{resource.columns.map((column) => <th key={column.key} className={['numeric', 'money'].includes(column.kind) ? 'numeric-cell' : ''}>{column.label}</th>)}<th className="actions-heading">Operaciones</th></tr></thead>
        <tbody>{visibleRecords.map((record) => <tr key={record.id}>{resource.columns.map((column) => <td key={column.key}><CellValue column={column} record={record} /></td>)}<td className="actions-cell">{rowActions(record)}</td></tr>)}</tbody>
      </table></div>
      <ul className="mobile-records" aria-label={`Registros de ${resource.title}`}>{visibleRecords.map((record) => <li key={record.id}>
        <div className="mobile-record-top"><strong>{resource.columns.find((column) => column.kind === 'primary')?.value(record) || `#${record.id}`}</strong>{record.estado && <Status value={record.estado} />}</div>
        <dl>{resource.columns.filter((column) => column.kind !== 'primary').slice(0, 3).map((column) => <div key={column.key}><dt>{column.label}</dt><dd><CellValue column={column} record={record} /></dd></div>)}</dl>
        {rowActions(record)}
      </li>)}</ul>
    </>}

    {panel && <RecordInspector resource={resource} record={panel.record} mode={panel.mode} options={options} onClose={() => setPanel(null)} onEdit={() => openPanel('edit', panel.record)} onDelete={() => askAction('delete', panel.record)} onSave={saveRecord}>
      {panel.mode !== 'view' && <RecordForm key={`${resource.key}-${panel.mode}-${panel.record?.id || 'new'}`} resource={resource} mode={panel.mode} record={panel.record} options={options} onCancel={() => setPanel(null)} onSave={saveRecord} />}
    </RecordInspector>}
    <ConfirmDialog target={confirm} busy={busy} error={confirmError} onCancel={() => { if (!busy) setConfirm(null); }} onConfirm={executeConfirmed} />
  </main>;
}
