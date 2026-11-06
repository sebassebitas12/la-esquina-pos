const missing = 'Sin dato';

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return missing;
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 2 }).format(Number(value));
}

export function formatQuantity(value) {
  if (value === null || value === undefined || value === '') return missing;
  return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 3 }).format(Number(value));
}

export function formatDate(value, includeTime = false) {
  if (!value) return missing;
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return new Intl.DateTimeFormat('es-CR', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export const statusLabels = {
  borrador: 'Borrador', recibida: 'Recibida', anulada: 'Anulada', confirmada: 'Confirmada',
  aplicado: 'Aplicado', anulada_pago: 'Anulado', procesada: 'Procesada', entrada: 'Entrada',
  salida: 'Salida', ajuste: 'Ajuste', devolucion: 'Devolución', activa: 'Activa', inactiva: 'Inactiva', anulado: 'Anulado'
};

const text = (value) => value || missing;
const money = formatMoney;
const quantity = formatQuantity;
const status = (value) => statusLabels[value] || text(value);
const col = (key, label, value, kind = 'text') => ({ key, label, value, kind });
const field = (name, label, type = 'text', extra = {}) => ({ name, label, type, ...extra });

export const resources = [
  {
    key: 'clientes', route: 'clientes', apiPath: 'clientes', group: 'Personas', title: 'Clientes', singular: 'cliente',
    description: 'Personas vinculadas a las ventas de la tienda.',
    fields: [field('nombre', 'Nombre completo', 'text', { required: true, maxLength: 150 }), field('correo', 'Correo electrónico', 'email', { maxLength: 254 }), field('telefono', 'Teléfono', 'tel', { maxLength: 30 })],
    columns: [col('nombre', 'Cliente', (r) => r.nombre, 'primary'), col('correo', 'Correo', (r) => text(r.correo)), col('telefono', 'Teléfono', (r) => text(r.telefono))],
    search: (r) => [r.id, r.nombre, r.correo, r.telefono].join(' ')
  },
  {
    key: 'categorias', route: 'catalogo/categorias', apiPath: 'categorias', group: 'Catálogo', title: 'Categorías', singular: 'categoría', createLabel: 'Nueva categoría',
    description: 'Clasificaciones que organizan los productos.',
    fields: [field('nombre', 'Nombre', 'text', { required: true, maxLength: 100 }), field('descripcion', 'Descripción', 'textarea', { maxLength: 255 }), field('activa', 'Activa', 'boolean', { defaultValue: true })],
    columns: [col('nombre', 'Categoría', (r) => r.nombre, 'primary'), col('descripcion', 'Descripción', (r) => text(r.descripcion)), col('activa', 'Estado', (r) => r.activa ? 'Activa' : 'Inactiva', 'status')],
    search: (r) => [r.id, r.nombre, r.descripcion].join(' ')
  },
  {
    key: 'marcas', route: 'catalogo/marcas', apiPath: 'marcas', group: 'Catálogo', title: 'Marcas', singular: 'marca',
    description: 'Marcas asociadas con los productos.',
    fields: [field('nombre', 'Nombre', 'text', { required: true, maxLength: 100 }), field('descripcion', 'Descripción', 'textarea', { maxLength: 255 }), field('activa', 'Activa', 'boolean', { defaultValue: true })],
    columns: [col('nombre', 'Marca', (r) => r.nombre, 'primary'), col('descripcion', 'Descripción', (r) => text(r.descripcion)), col('activa', 'Estado', (r) => r.activa ? 'Activa' : 'Inactiva', 'status')],
    search: (r) => [r.id, r.nombre, r.descripcion].join(' ')
  },
  {
    key: 'unidades-medida', route: 'catalogo/unidades-medida', apiPath: 'unidades-medida', group: 'Catálogo', title: 'Unidades de medida', singular: 'unidad de medida', createLabel: 'Nueva unidad de medida',
    description: 'Unidades utilizadas para contar y vender productos.',
    fields: [field('nombre', 'Nombre', 'text', { required: true, maxLength: 80 }), field('abreviatura', 'Abreviatura', 'text', { required: true, maxLength: 12 }), field('activa', 'Activa', 'boolean', { defaultValue: true })],
    columns: [col('nombre', 'Unidad', (r) => r.nombre, 'primary'), col('abreviatura', 'Abreviatura', (r) => r.abreviatura, 'mono'), col('activa', 'Estado', (r) => r.activa ? 'Activa' : 'Inactiva', 'status')],
    search: (r) => [r.id, r.nombre, r.abreviatura].join(' ')
  },
  {
    key: 'productos', route: 'catalogo/productos', apiPath: 'productos', group: 'Catálogo', title: 'Productos', singular: 'producto',
    description: 'Artículos, clasificación, precio de venta y disponibilidad.',
    emptyDescription: 'Para registrar productos necesitás al menos una categoría y una unidad de medida.',
    emptyLinks: [{ label: 'Crear categoría', to: '/catalogo/categorias' }, { label: 'Crear unidad', to: '/catalogo/unidades-medida' }],
    fields: [
      field('nombre', 'Nombre del producto', 'text', { required: true, maxLength: 150 }),
      field('sku', 'SKU', 'text', { required: true, maxLength: 40, help: 'Letras, números, guion o guion bajo.' }),
      field('codigoBarras', 'Código de barras', 'text', { maxLength: 14 }),
      field('precio', 'Precio de venta', 'money', { required: true, min: '0', step: '0.01' }),
      field('categoriaId', 'Categoría', 'select', { required: true, optionsKey: 'categorias' }),
      field('marcaId', 'Marca', 'select', { optionsKey: 'marcas', emptyLabel: 'Sin marca', nullable: true }),
      field('unidadMedidaId', 'Unidad de medida', 'select', { required: true, optionsKey: 'unidades-medida' }),
      field('descripcion', 'Descripción', 'textarea', { maxLength: 255 }), field('activo', 'Activo', 'boolean', { defaultValue: true })
    ],
    columns: [col('nombre', 'Producto', (r) => r.nombre, 'primary'), col('sku', 'SKU', (r) => text(r.sku), 'mono'), col('categoria', 'Categoría', (r) => text(r.categoria?.nombre)), col('existencia', 'Existencia', (r) => `${quantity(r.existencia?.cantidadActual)} ${r.unidadMedida?.abreviatura || ''}`, 'numeric'), col('precio', 'Precio', (r) => money(r.precio), 'money')],
    search: (r) => [r.id, r.nombre, r.sku, r.codigoBarras, r.categoria?.nombre, r.marca?.nombre].join(' ')
  },
  {
    key: 'proveedores', route: 'catalogo/proveedores', apiPath: 'proveedores', group: 'Catálogo', title: 'Proveedores', singular: 'proveedor',
    description: 'Empresas que abastecen los productos del minimercado.',
    fields: [field('nombre', 'Nombre comercial', 'text', { required: true, maxLength: 150 }), field('identificacion', 'Identificación', 'text', { maxLength: 30 }), field('contacto', 'Persona de contacto', 'text', { maxLength: 150 }), field('correo', 'Correo electrónico', 'email', { maxLength: 254 }), field('telefono', 'Teléfono', 'tel', { maxLength: 30 }), field('direccion', 'Dirección', 'text', { maxLength: 255 }), field('activo', 'Activo', 'boolean', { defaultValue: true })],
    columns: [col('nombre', 'Proveedor', (r) => r.nombre, 'primary'), col('contacto', 'Contacto', (r) => text(r.contacto)), col('telefono', 'Teléfono', (r) => text(r.telefono)), col('activo', 'Estado', (r) => r.activo ? 'Activo' : 'Inactivo', 'status')],
    search: (r) => [r.id, r.nombre, r.identificacion, r.contacto, r.correo, r.telefono].join(' ')
  },
  {
    key: 'productos-proveedores', route: 'catalogo/productos-proveedores', apiPath: 'productos-proveedores', group: 'Catálogo', title: 'Productos por proveedor', singular: 'relación',
    description: 'Costos y códigos que cada proveedor asigna a un producto.',
    fields: [field('proveedorId', 'Proveedor', 'select', { required: true, optionsKey: 'proveedores' }), field('productoId', 'Producto', 'select', { required: true, optionsKey: 'productos' }), field('codigoProveedor', 'Código del proveedor', 'text', { maxLength: 80 }), field('costoUnitario', 'Costo unitario', 'money', { required: true, min: '0', step: '0.01' }), field('preferido', 'Proveedor preferido', 'boolean', { defaultValue: false })],
    columns: [col('producto', 'Producto', (r) => r.producto?.nombre || `Producto #${r.productoId}`, 'primary'), col('proveedor', 'Proveedor', (r) => r.proveedor?.nombre || `Proveedor #${r.proveedorId}`), col('codigoProveedor', 'Código proveedor', (r) => text(r.codigoProveedor), 'mono'), col('costoUnitario', 'Costo', (r) => money(r.costoUnitario), 'money'), col('preferido', 'Preferido', (r) => r.preferido ? 'Sí' : 'No')],
    search: (r) => [r.id, r.producto?.nombre, r.producto?.sku, r.proveedor?.nombre, r.codigoProveedor].join(' ')
  },
  {
    key: 'compras', route: 'abastecimiento/compras', apiPath: 'compras', group: 'Abastecimiento', title: 'Compras', singular: 'compra', createLabel: 'Nueva compra',
    description: 'Órdenes de compra y recepción de productos.',
    fields: [field('proveedorId', 'Proveedor', 'select', { required: true, optionsKey: 'proveedores' }), field('fecha', 'Fecha', 'date', { defaultToday: true }), field('observaciones', 'Observaciones', 'textarea')],
    columns: [col('id', 'Compra', (r) => `#${r.id}`, 'primary'), col('proveedor', 'Proveedor', (r) => r.proveedor?.nombre || `Proveedor #${r.proveedorId}`), col('fecha', 'Fecha', (r) => formatDate(r.fecha)), col('detalles', 'Líneas', (r) => String(r.detalles?.length || 0), 'numeric'), col('total', 'Total', (r) => money(r.total), 'money'), col('estado', 'Estado', (r) => status(r.estado), 'status')],
    search: (r) => [r.id, r.proveedor?.nombre, r.fecha, r.estado].join(' '), filters: [{ value: 'borrador', label: 'Por recibir' }, { value: 'recibida', label: 'Recibidas' }, { value: 'anulada', label: 'Anuladas' }], actions: ['recibir', 'anular']
  },
  {
    key: 'detalles-compra', route: 'abastecimiento/detalles-compra', apiPath: 'detalles-compra', group: 'Abastecimiento', title: 'Líneas de compra', singular: 'línea de compra', createLabel: 'Nueva línea de compra',
    description: 'Productos, cantidades y costos de cada compra.',
    fields: [field('compraId', 'Compra en borrador', 'select', { required: true, optionsKey: 'compras', optionFilter: 'drafts' }), field('productoId', 'Producto', 'select', { required: true, optionsKey: 'productos' }), field('cantidad', 'Cantidad', 'decimal', { required: true, min: '0.001', step: '0.001' }), field('costoUnitario', 'Costo unitario', 'money', { required: true, min: '0', step: '0.01' })],
    columns: [col('producto', 'Producto', (r) => r.producto?.nombre || `Producto #${r.productoId}`, 'primary'), col('compra', 'Compra', (r) => `#${r.compraId}`), col('cantidad', 'Cantidad', (r) => quantity(r.cantidad), 'numeric'), col('costoUnitario', 'Costo unitario', (r) => money(r.costoUnitario), 'money')],
    search: (r) => [r.id, r.compraId, r.producto?.nombre, r.producto?.sku].join(' ')
  },
  {
    key: 'facturas', route: 'ventas/facturas', apiPath: 'facturas', group: 'Ventas', title: 'Facturas', singular: 'factura', createLabel: 'Nueva factura',
    description: 'Ventas en borrador, confirmadas y anuladas.',
    fields: [field('clienteId', 'Cliente', 'select', { optionsKey: 'clientes', nullable: true, emptyLabel: 'Consumidor Final / Mostrador' }), field('fecha', 'Fecha de venta', 'date', { defaultToday: true })],
    columns: [col('id', 'Factura', (r) => `#${r.id}`, 'primary'), col('cliente', 'Cliente', (r) => r.cliente?.nombre || (r.clienteId ? `Cliente #${r.clienteId}` : 'Consumidor Final / Mostrador')), col('fecha', 'Fecha', (r) => formatDate(r.fecha)), col('total', 'Total', (r) => money(r.total), 'money'), col('saldo', 'Saldo', (r) => money(r.saldo), 'money'), col('estado', 'Estado', (r) => status(r.estado), 'status')],
    search: (r) => [r.id, r.cliente?.nombre, r.cliente?.correo, r.clienteId, r.fecha, r.estado].join(' '), filters: [{ value: 'borrador', label: 'Borradores' }, { value: 'confirmada', label: 'Confirmadas' }, { value: 'anulada', label: 'Anuladas' }], actions: ['confirmar', 'anular']
  },
  {
    key: 'detalles-factura', route: 'ventas/detalles-factura', apiPath: 'detalles-factura', group: 'Ventas', title: 'Líneas de venta', singular: 'línea de venta', createLabel: 'Nueva línea de venta',
    description: 'Productos, cantidades y precios guardados en cada factura.',
    fields: [field('facturaId', 'Factura en borrador', 'select', { required: true, optionsKey: 'facturas', optionFilter: 'drafts' }), field('productoId', 'Producto', 'select', { required: true, optionsKey: 'productos' }), field('cantidad', 'Cantidad', 'decimal', { required: true, min: '0.001', step: '0.001' }), field('precioUnitario', 'Precio unitario', 'money', { required: true, min: '0', step: '0.01' })],
    columns: [col('producto', 'Producto', (r) => r.producto?.nombre || `Producto #${r.productoId}`, 'primary'), col('factura', 'Factura', (r) => `#${r.facturaId}`), col('cantidad', 'Cantidad', (r) => quantity(r.cantidad), 'numeric'), col('precioUnitario', 'Precio unitario', (r) => money(r.precioUnitario), 'money')],
    search: (r) => [r.id, r.facturaId, r.producto?.nombre, r.producto?.sku].join(' ')
  },
  {
    key: 'metodos-pago', route: 'ventas/metodos-pago', apiPath: 'metodos-pago', group: 'Ventas', title: 'Métodos de pago', singular: 'método de pago',
    description: 'Formas de cobro disponibles para las ventas.',
    fields: [field('codigo', 'Código', 'text', { required: true, maxLength: 30 }), field('nombre', 'Nombre', 'text', { required: true, maxLength: 80 }), field('activo', 'Activo', 'boolean', { defaultValue: true })],
    columns: [col('nombre', 'Método', (r) => r.nombre, 'primary'), col('codigo', 'Código', (r) => r.codigo, 'mono'), col('activo', 'Estado', (r) => r.activo ? 'Activo' : 'Inactivo', 'status')],
    search: (r) => [r.id, r.codigo, r.nombre].join(' ')
  },
  {
    key: 'pagos', route: 'ventas/pagos', apiPath: 'pagos', group: 'Ventas', title: 'Pagos', singular: 'pago',
    description: 'Abonos aplicados a facturas confirmadas.',
    fields: [field('facturaId', 'Factura confirmada', 'select', { required: true, optionsKey: 'facturas', optionFilter: 'confirmed' }), field('metodoPagoId', 'Método de pago', 'select', { required: true, optionsKey: 'metodos-pago' }), field('monto', 'Monto', 'money', { required: true, min: '0.01', step: '0.01' }), field('referencia', 'Referencia', 'text', { maxLength: 100 })],
    columns: [col('id', 'Pago', (r) => `#${r.id}`, 'primary'), col('factura', 'Factura', (r) => `#${r.facturaId}`), col('metodoPago', 'Método', (r) => r.metodoPago?.nombre || `Método #${r.metodoPagoId}`), col('fecha', 'Fecha', (r) => formatDate(r.fecha, true)), col('monto', 'Monto', (r) => money(r.monto), 'money'), col('estado', 'Estado', (r) => status(r.estado), 'status')],
    search: (r) => [r.id, r.facturaId, r.metodoPago?.nombre, r.referencia, r.estado].join(' '), deleteLabel: 'Anular pago'
  },
  {
    key: 'existencias', route: 'inventario/existencias', apiPath: 'existencias', group: 'Inventario', title: 'Existencias', singular: 'existencia',
    description: 'Saldo actual y mínimo de cada producto.', create: false, delete: false, updateLabel: 'Cambiar mínimo',
    emptyDescription: 'Las existencias se calculan automáticamente cuando registrás productos o ingresás órdenes de compra',
    fields: [field('cantidadMinima', 'Mínimo para reponer', 'decimal', { required: true, min: '0', step: '0.001' })],
    columns: [col('producto', 'Producto', (r) => r.producto?.nombre || `Producto #${r.productoId}`, 'primary'), col('sku', 'SKU', (r) => text(r.producto?.sku), 'mono'), col('actual', 'Actual', (r) => `${quantity(r.cantidadActual)} ${r.producto?.unidadMedida?.abreviatura || ''}`, 'numeric'), col('minimo', 'Mínimo', (r) => `${quantity(r.cantidadMinima)} ${r.producto?.unidadMedida?.abreviatura || ''}`, 'numeric'), col('estado', 'Reposición', (r) => r.requiereReposicion ? 'Reponer' : 'En rango', 'status')],
    search: (r) => [r.producto?.nombre, r.producto?.sku, r.producto?.categoria?.nombre].join(' ')
  },
  {
    key: 'movimientos-inventario', route: 'inventario/movimientos', apiPath: 'movimientos-inventario', group: 'Inventario', title: 'Movimientos', singular: 'movimiento',
    description: 'Entradas, salidas y ajustes que explican el inventario.', update: false, delete: false,
    fields: [field('productoId', 'Producto', 'select', { required: true, optionsKey: 'productos' }), field('tipo', 'Tipo de movimiento', 'select', { required: true, values: [['entrada', 'Entrada'], ['salida', 'Salida'], ['ajuste', 'Ajuste']] }), field('cantidad', 'Cantidad', 'decimal', { required: true, step: '0.001', help: 'En un ajuste, usá un valor positivo o negativo.' }), field('nota', 'Motivo', 'textarea', { maxLength: 255, help: 'El motivo es obligatorio para ajustes.' })],
    columns: [col('fecha', 'Fecha', (r) => formatDate(r.createdAt, true)), col('producto', 'Producto', (r) => r.producto?.nombre || `Producto #${r.productoId}`, 'primary'), col('tipo', 'Tipo', (r) => status(r.tipo), 'status'), col('cantidad', 'Cantidad', (r) => `${r.tipo === 'salida' ? '−' : r.tipo === 'entrada' || r.tipo === 'devolucion' ? '+' : ''}${quantity(r.cantidad)}`, 'numeric'), col('nota', 'Motivo', (r) => text(r.nota))],
    search: (r) => [r.id, r.producto?.nombre, r.tipo, r.nota].join(' ')
  },
  {
    key: 'devoluciones', route: 'devoluciones', apiPath: 'devoluciones', group: 'Inventario', title: 'Devoluciones', singular: 'devolución', createLabel: 'Nueva devolución',
    description: 'Devoluciones vinculadas a ventas confirmadas.',
    fields: [field('facturaId', 'Factura confirmada', 'select', { required: true, optionsKey: 'facturas', optionFilter: 'confirmed' }), field('motivo', 'Motivo', 'text', { required: true, maxLength: 255 })],
    columns: [col('id', 'Devolución', (r) => `#${r.id}`, 'primary'), col('factura', 'Factura', (r) => `#${r.facturaId}`), col('fecha', 'Fecha', (r) => formatDate(r.fecha)), col('detalles', 'Líneas', (r) => String(r.detalles?.length || 0), 'numeric'), col('motivo', 'Motivo', (r) => text(r.motivo)), col('estado', 'Estado', (r) => status(r.estado), 'status')],
    search: (r) => [r.id, r.facturaId, r.motivo, r.estado].join(' '), filters: [{ value: 'borrador', label: 'Por procesar' }, { value: 'procesada', label: 'Procesadas' }], actions: ['procesar']
  },
  {
    key: 'detalles-devolucion', route: 'devoluciones/detalles', apiPath: 'detalles-devolucion', group: 'Inventario', title: 'Líneas de devolución', singular: 'línea de devolución', createLabel: 'Nueva línea de devolución',
    description: 'Productos devueltos asociados a las líneas originales de venta.',
    fields: [field('devolucionId', 'Devolución en borrador', 'select', { required: true, optionsKey: 'devoluciones', optionFilter: 'drafts' }), field('detalleFacturaId', 'Línea de venta', 'select', { required: true, optionsKey: 'detalles-factura' }), field('cantidad', 'Cantidad devuelta', 'decimal', { required: true, min: '0.001', step: '0.001' })],
    columns: [col('producto', 'Producto', (r) => r.detalleFactura?.producto?.nombre || `Línea #${r.detalleFacturaId}`, 'primary'), col('devolución', 'Devolución', (r) => `#${r.devolucionId}`), col('cantidad', 'Cantidad', (r) => quantity(r.cantidad), 'numeric'), col('precioUnitario', 'Precio aplicado', (r) => money(r.precioUnitario), 'money')],
    search: (r) => [r.id, r.devolucionId, r.detalleFactura?.producto?.nombre, r.detalleFacturaId].join(' ')
  }
];

export const resourcesByKey = Object.fromEntries(resources.map((resource) => [resource.key, resource]));

export const moduleNavigation = [
  { key: 'home', label: 'Inicio', route: '/' },
  { key: 'sales', label: 'Caja y Ventas', route: '/ventas/facturas', group: 'Ventas', activeGroups: ['Personas'] },
  { key: 'catalog', label: 'Catálogo', route: '/catalogo/productos', group: 'Catálogo' },
  { key: 'purchases', label: 'Abastecimiento', route: '/abastecimiento/compras', group: 'Abastecimiento' },
  { key: 'inventory', label: 'Inventario', route: '/inventario/existencias', group: 'Inventario' }
];
