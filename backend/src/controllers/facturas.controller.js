const { sequelize, Cliente, Producto, Usuario, Factura, DetalleFactura, Existencia, MovimientoInventario, Pago, Devolucion } = require('../../models');
const { parseId, validateBody, isValidDateOnly } = require('../utils/validation');
const { toMilli, fromMilli } = require('../utils/quantity');
const { lineTotalCents, toCents, fromCents } = require('../utils/money');
const httpError = require('../utils/http-error');

const fields = ['clienteId', 'fecha'];
const detailInclude = { model: DetalleFactura, as: 'detalles', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'sku'] }] };
const paymentInclude = { model: Pago, as: 'pagos', where: { estado: 'aplicado' }, required: false, attributes: ['id', 'monto', 'metodoPagoId', 'fecha'] };
const include = [
  { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'correo', 'telefono'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
  detailInclude,
  paymentInclude,
  { model: Devolucion, as: 'devoluciones', attributes: ['id', 'fecha', 'estado'] }
];

function validateFactura(body, partial = false, creating = false) {
  const requiredFields = partial || creating ? [] : fields;
  const bodyError = validateBody(body, fields, requiredFields, partial);
  if (bodyError) return bodyError;
  if (Object.hasOwn(body, 'clienteId') && body.clienteId !== null && body.clienteId !== '' && !parseId(body.clienteId)) return 'clienteId debe ser un entero positivo o null para consumidor final.';
  if (Object.hasOwn(body, 'fecha') && !isValidDateOnly(body.fecha)) return 'La fecha debe tener el formato YYYY-MM-DD y ser válida.';
  return null;
}

function normalizeFactura(body) {
  const data = {};
  if (Object.hasOwn(body, 'clienteId')) data.clienteId = body.clienteId === null || body.clienteId === '' ? null : parseId(body.clienteId);
  if (Object.hasOwn(body, 'fecha')) data.fecha = body.fecha;
  return data;
}

function serialize(invoice) {
  const data = invoice.toJSON();
  const lines = data.detalles || [];
  const payments = data.pagos || [];
  const totalCents = lines.reduce((sum, line) => sum + lineTotalCents(line.precioUnitario, line.cantidad), 0);
  const paidCents = payments.reduce((sum, payment) => sum + toCents(payment.monto), 0);
  data.total = fromCents(totalCents);
  data.totalPagado = fromCents(paidCents);
  data.saldo = fromCents(Math.max(0, totalCents - paidCents));
  return data;
}

async function validarCliente(clienteId) {
  return Cliente.findByPk(clienteId);
}

async function crear(req, res) {
  const error = validateFactura(req.body, false, true);
  if (error) return res.status(400).json({ error });
  const data = normalizeFactura(req.body);
  if (data.clienteId != null && !(await validarCliente(data.clienteId))) return res.status(404).json({ error: 'No se encontró el cliente indicado.' });
  const factura = await Factura.create({ ...data, usuarioId: req.auth.usuarioId, estado: 'borrador' });
  return res.status(201).json({ data: factura });
}

async function listar(_req, res) {
  const invoices = await Factura.findAll({ include, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: invoices.map(serialize) });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const invoice = await Factura.findByPk(id, { include });
  if (!invoice) return res.status(404).json({ error: 'No se encontró la factura.' });
  return res.status(200).json({ data: serialize(invoice) });
}

async function actualizarFactura(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const invoice = await Factura.findByPk(id);
  if (!invoice) return res.status(404).json({ error: 'No se encontró la factura.' });
  if (invoice.estado !== 'borrador') return res.status(409).json({ error: 'Solo se pueden editar facturas en borrador.' });
  const error = validateFactura(req.body, partial);
  if (error) return res.status(400).json({ error });
  const data = normalizeFactura(req.body);
  if (data.clienteId != null && !(await validarCliente(data.clienteId))) return res.status(404).json({ error: 'No se encontró el cliente indicado.' });
  await invoice.update(data);
  return res.status(200).json({ data: invoice });
}

async function actualizar(req, res) { return actualizarFactura(req, res, false); }
async function actualizarParcial(req, res) { return actualizarFactura(req, res, true); }

async function confirmar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice) throw httpError(404, 'No se encontró la factura.');
    if (invoice.estado !== 'borrador') throw httpError(409, 'Solo se puede confirmar una factura en borrador.');
    const lines = await DetalleFactura.findAll({ where: { facturaId: id }, transaction, order: [['id', 'ASC']] });
    if (!lines.length) throw httpError(409, 'Agregá al menos un producto antes de confirmar la venta.');

    for (const line of lines) {
      const product = await Producto.findByPk(line.productoId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!product || !product.activo) throw httpError(409, `El producto #${line.productoId} no existe o está inactivo.`);
      const stock = await Existencia.findOne({ where: { productoId: line.productoId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) throw httpError(409, `El producto #${line.productoId} no tiene un registro de existencias.`);
      const current = toMilli(stock.cantidadActual);
      const requested = toMilli(line.cantidad);
      if (current < requested) throw httpError(409, `Stock insuficiente para ${product.nombre}: hay ${fromMilli(current)} y se requieren ${fromMilli(requested)}.`);
      await stock.update({ cantidadActual: fromMilli(current - requested) }, { transaction });
      await MovimientoInventario.create({
        productoId: line.productoId,
        usuarioId: req.auth.usuarioId,
        facturaId: id,
        tipo: 'salida',
        cantidad: line.cantidad,
        nota: `Venta confirmada, factura #${id}`
      }, { transaction });
    }
    await invoice.update({ estado: 'confirmada', fechaConfirmacion: new Date(), usuarioId: req.auth.usuarioId }, { transaction });
  });

  const invoice = await Factura.findByPk(id, { include });
  return res.status(200).json({ data: serialize(invoice) });
}

async function anular(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice) throw httpError(404, 'No se encontró la factura.');
    if (invoice.estado !== 'confirmada') throw httpError(409, 'Solo se puede anular una factura confirmada.');
    const [paymentCount, returnCount] = await Promise.all([
      Pago.count({ where: { facturaId: id, estado: 'aplicado' }, transaction }),
      Devolucion.count({ where: { facturaId: id }, transaction })
    ]);
    if (paymentCount || returnCount) throw httpError(409, 'No se puede anular: la factura ya tiene pagos o devoluciones procesadas.');
    const lines = await DetalleFactura.findAll({ where: { facturaId: id }, transaction, order: [['id', 'ASC']] });
    for (const line of lines) {
      const stock = await Existencia.findOne({ where: { productoId: line.productoId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) throw httpError(409, `El producto #${line.productoId} no tiene un registro de existencias.`);
      const next = toMilli(stock.cantidadActual) + toMilli(line.cantidad);
      await stock.update({ cantidadActual: fromMilli(next) }, { transaction });
      await MovimientoInventario.create({
        productoId: line.productoId,
        usuarioId: req.auth.usuarioId,
        facturaId: id,
        tipo: 'entrada',
        cantidad: line.cantidad,
        nota: `Reversión por anulación de factura #${id}`
      }, { transaction });
    }
    await invoice.update({ estado: 'anulada' }, { transaction });
  });
  const invoice = await Factura.findByPk(id, { include });
  return res.status(200).json({ data: serialize(invoice) });
}

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const invoice = await Factura.findByPk(id);
  if (!invoice) return res.status(404).json({ error: 'No se encontró la factura.' });
  if (invoice.estado !== 'borrador') return res.status(409).json({ error: 'Solo se pueden eliminar facturas en borrador; las ventas procesadas conservan su historial.' });
  await invoice.destroy();
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, confirmar, anular, eliminar };
