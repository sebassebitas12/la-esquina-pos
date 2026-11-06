const { sequelize, DetalleCompra, Compra, Producto, Proveedor } = require('../../models');
const { parseId, validateBody, isValidMoney } = require('../utils/validation');
const { isValidQuantity } = require('../utils/quantity');
const httpError = require('../utils/http-error');

const createFields = ['compraId', 'productoId', 'cantidad', 'costoUnitario'];
const updateFields = ['productoId', 'cantidad', 'costoUnitario'];
const include = [
  { model: Compra, as: 'compra', attributes: ['id', 'fecha', 'estado'], include: [{ model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] }] },
  { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'sku'] }
];

function validate(body, partial, creating = false) {
  const fields = creating ? createFields : updateFields;
  const error = validateBody(body, fields, partial ? [] : fields, partial);
  if (error) return error;
  for (const key of ['compraId', 'productoId']) if (Object.hasOwn(body, key) && !parseId(body[key])) return `${key} debe ser un entero positivo.`;
  if (Object.hasOwn(body, 'cantidad') && !isValidQuantity(body.cantidad)) return 'La cantidad debe ser mayor a cero y tener hasta tres decimales.';
  if (Object.hasOwn(body, 'costoUnitario') && !isValidMoney(body.costoUnitario)) return 'El costo unitario debe ser igual o mayor a cero y tener hasta dos decimales.';
  return null;
}

function normalize(body) {
  const data = { ...body };
  for (const key of ['compraId', 'productoId']) if (data[key] !== undefined) data[key] = Number(data[key]);
  for (const key of ['cantidad', 'costoUnitario']) if (data[key] !== undefined) data[key] = String(data[key]);
  return data;
}

function sendError(res, error) {
  if (!error) return false;
  if (typeof error === 'string') res.status(400).json({ error });
  else res.status(error.status).json({ error: error.message });
  return true;
}

async function listar(_req, res) {
  const lines = await DetalleCompra.findAll({ include, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: lines });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const line = await DetalleCompra.findByPk(id, { include });
  if (!line) return res.status(404).json({ error: 'No se encontró el detalle de compra.' });
  return res.status(200).json({ data: line });
}

async function crear(req, res) {
  if (sendError(res, validate(req.body, false, true))) return;
  const line = await sequelize.transaction(async (transaction) => {
    const purchase = await Compra.findByPk(req.body.compraId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!purchase) throw httpError(404, 'No se encontró la compra indicada.');
    if (purchase.estado !== 'borrador') throw httpError(409, 'Solo se pueden agregar detalles a compras en borrador.');
    if (!(await Producto.findByPk(req.body.productoId, { transaction }))) throw httpError(404, 'No se encontró el producto indicado.');
    return DetalleCompra.create(normalize(req.body), { transaction });
  });
  return res.status(201).json({ data: line });
}

async function update(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const snapshot = await DetalleCompra.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró el detalle de compra.' });
  if (sendError(res, validate(req.body, partial))) return;
  const line = await sequelize.transaction(async (transaction) => {
    const purchase = await Compra.findByPk(snapshot.compraId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!purchase || purchase.estado !== 'borrador') throw httpError(409, 'No se puede editar una línea de compra que ya fue recibida o anulada.');
    const current = await DetalleCompra.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!current) throw httpError(404, 'No se encontró el detalle de compra.');
    if (req.body.productoId !== undefined && !(await Producto.findByPk(req.body.productoId, { transaction }))) throw httpError(404, 'No se encontró el producto indicado.');
    await current.update(normalize(req.body), { transaction });
    return current;
  });
  return res.status(200).json({ data: line });
}

async function actualizar(req, res) { return update(req, res, false); }
async function actualizarParcial(req, res) { return update(req, res, true); }

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const snapshot = await DetalleCompra.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró el detalle de compra.' });
  await sequelize.transaction(async (transaction) => {
    const purchase = await Compra.findByPk(snapshot.compraId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!purchase || purchase.estado !== 'borrador') throw httpError(409, 'No se puede eliminar una línea de compra procesada.');
    const line = await DetalleCompra.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!line) throw httpError(404, 'No se encontró el detalle de compra.');
    await line.destroy({ transaction });
  });
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, eliminar };
