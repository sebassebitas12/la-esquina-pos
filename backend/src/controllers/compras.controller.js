const { sequelize, Compra, Proveedor, Usuario, DetalleCompra, Producto, Existencia, MovimientoInventario } = require('../../models');
const { parseId, validateBody, isValidDateOnly } = require('../utils/validation');
const { toMilli, fromMilli } = require('../utils/quantity');
const { toCents, lineTotalCents, fromCents } = require('../utils/money');
const httpError = require('../utils/http-error');

const fields = ['proveedorId', 'fecha', 'observaciones'];
const include = [
  { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
  { model: DetalleCompra, as: 'detalles', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'sku'] }] }
];

function validate(body, partial) {
  const error = validateBody(body, fields, partial ? [] : ['proveedorId'], partial);
  if (error) return error;
  if (Object.hasOwn(body, 'proveedorId') && !parseId(body.proveedorId)) return 'proveedorId debe ser un entero positivo.';
  if (Object.hasOwn(body, 'fecha') && !isValidDateOnly(body.fecha)) return 'La fecha debe tener el formato YYYY-MM-DD y ser válida.';
  if (Object.hasOwn(body, 'observaciones') && body.observaciones !== null && typeof body.observaciones !== 'string') return 'observaciones debe ser texto o null.';
  return null;
}

function normalize(body) {
  const data = { ...body };
  if (data.proveedorId !== undefined) data.proveedorId = Number(data.proveedorId);
  if (typeof data.observaciones === 'string') data.observaciones = data.observaciones.trim() || null;
  return data;
}

function serialize(compra) {
  const data = compra.toJSON();
  const total = (data.detalles || []).reduce((sum, line) => sum + lineTotalCents(line.costoUnitario, line.cantidad), 0);
  data.total = fromCents(total);
  return data;
}

async function validarProveedor(id) {
  const supplier = await Proveedor.findByPk(id);
  return supplier && supplier.activo ? null : 'El proveedor indicado no existe o está inactivo.';
}

async function listar(_req, res) {
  const compras = await Compra.findAll({ include, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: compras.map(serialize) });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const compra = await Compra.findByPk(id, { include });
  if (!compra) return res.status(404).json({ error: 'No se encontró la compra.' });
  return res.status(200).json({ data: serialize(compra) });
}

async function crear(req, res) {
  const error = validate(req.body, false);
  if (error) return res.status(400).json({ error });
  const relationError = await validarProveedor(req.body.proveedorId);
  if (relationError) return res.status(404).json({ error: relationError });
  const compra = await Compra.create({ ...normalize(req.body), usuarioId: req.auth.usuarioId, estado: 'borrador' });
  return res.status(201).json({ data: compra });
}

async function update(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const compra = await Compra.findByPk(id);
  if (!compra) return res.status(404).json({ error: 'No se encontró la compra.' });
  if (compra.estado !== 'borrador') return res.status(409).json({ error: 'Solo se pueden editar compras en borrador.' });
  const error = validate(req.body, partial);
  if (error) return res.status(400).json({ error });
  if (Object.hasOwn(req.body, 'proveedorId')) {
    const relationError = await validarProveedor(req.body.proveedorId);
    if (relationError) return res.status(404).json({ error: relationError });
  }
  await compra.update(normalize(req.body));
  return res.status(200).json({ data: compra });
}

async function actualizar(req, res) { return update(req, res, false); }
async function actualizarParcial(req, res) { return update(req, res, true); }

async function recibir(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  await sequelize.transaction(async (transaction) => {
    const compra = await Compra.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!compra) throw httpError(404, 'No se encontró la compra.');
    if (compra.estado !== 'borrador') throw httpError(409, 'Solo se puede recibir una compra en borrador.');
    const lines = await DetalleCompra.findAll({ where: { compraId: id }, transaction, order: [['id', 'ASC']] });
    if (!lines.length) throw httpError(409, 'Agregá al menos un producto antes de recibir la compra.');

    for (const line of lines) {
      let stock = await Existencia.findOne({ where: { productoId: line.productoId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) stock = await Existencia.create({ productoId: line.productoId, cantidadActual: 0, cantidadMinima: 0 }, { transaction });
      const next = toMilli(stock.cantidadActual) + toMilli(line.cantidad);
      await stock.update({ cantidadActual: fromMilli(next) }, { transaction });
      await MovimientoInventario.create({
        productoId: line.productoId,
        usuarioId: req.auth.usuarioId,
        compraId: id,
        tipo: 'entrada',
        cantidad: line.cantidad,
        nota: `Recepción de compra #${id}`
      }, { transaction });
    }
    await compra.update({ estado: 'recibida', fechaRecepcion: new Date() }, { transaction });
  });

  const compra = await Compra.findByPk(id, { include });
  return res.status(200).json({ data: serialize(compra) });
}

async function anular(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const compra = await Compra.findByPk(id);
  if (!compra) return res.status(404).json({ error: 'No se encontró la compra.' });
  if (compra.estado !== 'borrador') return res.status(409).json({ error: 'Solo se puede anular una compra en borrador; una compra recibida conserva su historial.' });
  await compra.update({ estado: 'anulada' });
  return res.status(200).json({ data: compra });
}

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const compra = await Compra.findByPk(id);
  if (!compra) return res.status(404).json({ error: 'No se encontró la compra.' });
  if (compra.estado !== 'borrador') return res.status(409).json({ error: 'Solo se pueden eliminar compras en borrador; anulá o conservá los documentos procesados.' });
  await compra.destroy();
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, recibir, anular, eliminar };
