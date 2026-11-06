const { sequelize, DetalleFactura, Factura, Producto, Cliente } = require('../../models');
const { parseId, validateBody, isValidMoney } = require('../utils/validation');
const { isValidQuantity } = require('../utils/quantity');
const httpError = require('../utils/http-error');

const createFields = ['facturaId', 'productoId', 'cantidad', 'precioUnitario'];
const updateFields = ['productoId', 'cantidad', 'precioUnitario'];
const include = [
  { model: Factura, as: 'factura', attributes: ['id', 'fecha', 'clienteId', 'estado'], include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nombre'] }] },
  { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'sku', 'precio'] }
];

function validateDetalle(body, partial = false, creating = false) {
  const fields = creating ? createFields : updateFields;
  const requiredFields = partial ? [] : fields;
  const bodyError = validateBody(body, fields, requiredFields, partial);
  if (bodyError) return bodyError;
  for (const key of ['facturaId', 'productoId']) if (Object.hasOwn(body, key) && !parseId(body[key])) return `${key} debe ser un entero positivo.`;
  if (Object.hasOwn(body, 'cantidad') && !isValidQuantity(body.cantidad)) return 'La cantidad debe ser mayor a cero y tener hasta tres decimales.';
  if (Object.hasOwn(body, 'precioUnitario') && !isValidMoney(body.precioUnitario)) return 'El precio unitario debe ser igual o mayor a cero y tener hasta dos decimales.';
  return null;
}

function normalizeDetalle(body) {
  const data = { ...body };
  for (const key of ['facturaId', 'productoId']) if (data[key] !== undefined) data[key] = Number(data[key]);
  for (const key of ['cantidad', 'precioUnitario']) if (data[key] !== undefined) data[key] = String(data[key]);
  return data;
}

function sendError(res, error) {
  if (!error) return false;
  if (typeof error === 'string') res.status(400).json({ error });
  else res.status(error.status).json({ error: error.message });
  return true;
}

async function crear(req, res) {
  if (sendError(res, validateDetalle(req.body, false, true))) return;
  const detalle = await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(req.body.facturaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice) throw httpError(404, 'No se encontró la factura indicada.');
    if (invoice.estado !== 'borrador') throw httpError(409, 'Solo se pueden agregar líneas a facturas en borrador.');
    const product = await Producto.findByPk(req.body.productoId, { transaction });
    if (!product || !product.activo) throw httpError(404, 'El producto indicado no existe o está inactivo.');
    return DetalleFactura.create(normalizeDetalle(req.body), { transaction });
  });
  return res.status(201).json({ data: detalle });
}

async function listar(_req, res) {
  const detalles = await DetalleFactura.findAll({ include, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: detalles });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const detalle = await DetalleFactura.findByPk(id, { include });
  if (!detalle) return res.status(404).json({ error: 'No se encontró el detalle de factura.' });
  return res.status(200).json({ data: detalle });
}

async function update(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  if (sendError(res, validateDetalle(req.body, partial))) return;
  const snapshot = await DetalleFactura.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró el detalle de factura.' });
  const detail = await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(snapshot.facturaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice || invoice.estado !== 'borrador') throw httpError(409, 'No se puede editar una línea de una venta confirmada o anulada.');
    const current = await DetalleFactura.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!current) throw httpError(404, 'No se encontró el detalle de factura.');
    if (req.body.productoId !== undefined) {
      const product = await Producto.findByPk(req.body.productoId, { transaction });
      if (!product || !product.activo) throw httpError(404, 'El producto indicado no existe o está inactivo.');
    }
    await current.update(normalizeDetalle(req.body), { transaction });
    return current;
  });
  return res.status(200).json({ data: detail });
}

async function actualizar(req, res) { return update(req, res, false); }
async function actualizarParcial(req, res) { return update(req, res, true); }

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const snapshot = await DetalleFactura.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró el detalle de factura.' });
  await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(snapshot.facturaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice || invoice.estado !== 'borrador') throw httpError(409, 'No se puede eliminar una línea de una venta confirmada o anulada.');
    const detail = await DetalleFactura.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!detail) throw httpError(404, 'No se encontró el detalle de factura.');
    await detail.destroy({ transaction });
  });
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, eliminar };
