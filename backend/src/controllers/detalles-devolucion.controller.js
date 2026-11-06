const { sequelize, DetalleDevolucion, Devolucion, DetalleFactura, Factura, Producto } = require('../../models');
const { parseId, validateBody } = require('../utils/validation');
const { isValidQuantity } = require('../utils/quantity');
const httpError = require('../utils/http-error');

const include = [
  { model: Devolucion, as: 'devolucion', attributes: ['id', 'facturaId', 'estado'] },
  { model: DetalleFactura, as: 'detalleFactura', include: [
    { model: Factura, as: 'factura', attributes: ['id', 'estado', 'fecha'] },
    { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'sku'] }
  ] }
];

function validate(body, partial) {
  const fields = partial ? ['cantidad'] : ['devolucionId', 'detalleFacturaId', 'cantidad'];
  const required = partial ? [] : fields;
  const error = validateBody(body, fields, required, partial);
  if (error) return error;
  for (const key of ['devolucionId', 'detalleFacturaId']) if (Object.hasOwn(body, key) && !parseId(body[key])) return `${key} debe ser un entero positivo.`;
  if (Object.hasOwn(body, 'cantidad') && !isValidQuantity(body.cantidad)) return 'La cantidad devuelta debe ser mayor a cero y tener hasta tres decimales.';
  return null;
}

function sendError(res, error) {
  if (!error) return false;
  if (typeof error === 'string') res.status(400).json({ error });
  else res.status(error.status).json({ error: error.message });
  return true;
}

async function listar(_req, res) {
  const details = await DetalleDevolucion.findAll({ include, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: details });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const detail = await DetalleDevolucion.findByPk(id, { include });
  if (!detail) return res.status(404).json({ error: 'No se encontró el detalle de devolución.' });
  return res.status(200).json({ data: detail });
}

async function crear(req, res) {
  if (sendError(res, validate(req.body, false))) return;
  const detail = await sequelize.transaction(async (transaction) => {
    const returnRecord = await Devolucion.findByPk(req.body.devolucionId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!returnRecord) throw httpError(404, 'No se encontró la devolución indicada.');
    if (returnRecord.estado !== 'borrador') throw httpError(409, 'Solo se pueden agregar detalles a devoluciones en borrador.');
    const soldLine = await DetalleFactura.findByPk(req.body.detalleFacturaId, { include: [{ model: Factura, as: 'factura' }], transaction });
    if (!soldLine) throw httpError(404, 'No se encontró la línea de venta indicada.');
    if (soldLine.facturaId !== returnRecord.facturaId) throw httpError(400, 'La línea seleccionada pertenece a otra factura.');
    if (soldLine.factura.estado !== 'confirmada') throw httpError(409, 'Solo se devuelven productos de ventas confirmadas.');
    return DetalleDevolucion.create({
      devolucionId: returnRecord.id,
      detalleFacturaId: soldLine.id,
      cantidad: String(req.body.cantidad),
      precioUnitario: soldLine.precioUnitario
    }, { transaction });
  });
  return res.status(201).json({ data: detail });
}

async function update(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  if (sendError(res, validate(req.body, partial))) return;
  const snapshot = await DetalleDevolucion.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró el detalle de devolución.' });
  const detail = await sequelize.transaction(async (transaction) => {
    const returnRecord = await Devolucion.findByPk(snapshot.devolucionId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!returnRecord || returnRecord.estado !== 'borrador') throw httpError(409, 'No se pueden editar detalles de una devolución procesada.');
    const current = await DetalleDevolucion.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!current) throw httpError(404, 'No se encontró el detalle de devolución.');
    if (!partial && (Number(req.body.devolucionId) !== current.devolucionId || Number(req.body.detalleFacturaId) !== current.detalleFacturaId)) {
      throw httpError(400, 'No se pueden cambiar las líneas de venta o devolución después de crear el detalle.');
    }
    await current.update({ cantidad: String(req.body.cantidad) }, { transaction });
    return current;
  });
  return res.status(200).json({ data: detail });
}

async function actualizar(req, res) { return update(req, res, false); }
async function actualizarParcial(req, res) { return update(req, res, true); }

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const snapshot = await DetalleDevolucion.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró el detalle de devolución.' });
  await sequelize.transaction(async (transaction) => {
    const returnRecord = await Devolucion.findByPk(snapshot.devolucionId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!returnRecord || returnRecord.estado !== 'borrador') throw httpError(409, 'No se puede eliminar un detalle ya procesado.');
    const detail = await DetalleDevolucion.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!detail) throw httpError(404, 'No se encontró el detalle de devolución.');
    await detail.destroy({ transaction });
  });
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, eliminar };
