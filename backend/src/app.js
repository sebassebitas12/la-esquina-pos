const express = require('express');
const clientesRoutes = require('./routes/clientes.routes');
const productosRoutes = require('./routes/productos.routes');
const facturasRoutes = require('./routes/facturas.routes');
const detallesFacturaRoutes = require('./routes/detalles-factura.routes');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const marcasRoutes = require('./routes/marcas.routes');
const unidadesMedidaRoutes = require('./routes/unidades-medida.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const productosProveedoresRoutes = require('./routes/productos-proveedores.routes');
const comprasRoutes = require('./routes/compras.routes');
const detallesCompraRoutes = require('./routes/detalles-compra.routes');
const metodosPagoRoutes = require('./routes/metodos-pago.routes');
const pagosRoutes = require('./routes/pagos.routes');
const existenciasRoutes = require('./routes/existencias.routes');
const movimientosInventarioRoutes = require('./routes/movimientos-inventario.routes');
const devolucionesRoutes = require('./routes/devoluciones.routes');
const detallesDevolucionRoutes = require('./routes/detalles-devolucion.routes');
const aiRoutes = require('./routes/ai.routes');
const autenticar = require('./middlewares/auth.middleware');

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = new Set(['http://localhost:5174', 'http://127.0.0.1:5174']);
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/clientes', autenticar, clientesRoutes);
app.use('/api/productos', autenticar, productosRoutes);
app.use('/api/facturas', autenticar, facturasRoutes);
app.use('/api/detalles-factura', autenticar, detallesFacturaRoutes);
app.use('/api/categorias', autenticar, categoriasRoutes);
app.use('/api/marcas', autenticar, marcasRoutes);
app.use('/api/unidades-medida', autenticar, unidadesMedidaRoutes);
app.use('/api/proveedores', autenticar, proveedoresRoutes);
app.use('/api/productos-proveedores', autenticar, productosProveedoresRoutes);
app.use('/api/compras', autenticar, comprasRoutes);
app.use('/api/detalles-compra', autenticar, detallesCompraRoutes);
app.use('/api/metodos-pago', autenticar, metodosPagoRoutes);
app.use('/api/pagos', autenticar, pagosRoutes);
app.use('/api/existencias', autenticar, existenciasRoutes);
app.use('/api/movimientos-inventario', autenticar, movimientosInventarioRoutes);
app.use('/api/devoluciones', autenticar, devolucionesRoutes);
app.use('/api/detalles-devolucion', autenticar, detallesDevolucionRoutes);
app.use('/api/ai', autenticar, aiRoutes);

app.use((_req, res) => res.status(404).json({ error: 'La ruta solicitada no existe.' }));

app.use((error, _req, res, _next) => {
  if (error.status === 413 && error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la solicitud supera el límite de 32 KB.' });
  }
  if (error.status === 400 && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo debe contener JSON válido.' });
  }
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({ error: error.errors.map((item) => item.message).join(' ') });
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    const isEmail = error.fields?.correo || error.errors?.some((item) => item.path === 'correo');
    return res.status(400).json({ error: isEmail ? 'El correo ya está registrado.' : 'Ya existe un registro con ese valor único.' });
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ error: 'No se puede completar la operación porque hay registros relacionados.' });
  }
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: 'Ocurrió un error interno.' });
});

module.exports = app;
