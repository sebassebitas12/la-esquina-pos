const { sequelize, Devolucion, Usuario, Factura, DetalleFactura, DetalleDevolucion, Producto, Existencia, MovimientoInventario } = require('../../models');
const { parseId, validateBody, isValidName } = require('../utils/validation');
const { toMilli, fromMilli } = require('../utils/quantity');
const { lineTotalCents, fromCents } = require('../utils/money');
const httpError = require('../utils/http-error');

const include = [
  { model: Factura, as: 'factura', attributes: ['id', 'fecha', 'estado', 'clienteId'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
  { model: DetalleDevolucion, as: 'detalles', include: [{ model: DetalleFactura, as: 'detalleFactura', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'sku'] }] }] }
];

function serialize(returnRecord) {
  const data = returnRecord.toJSON();
  const cents = (data.detalles || []).reduce((sum, line) => sum + lineTotalCents(line.precioUnitario, line.cantidad), 0);
  data.total = fromCents(cents);
  return data;
}

function validate(body, partial) {
  const fields = partial ? ['motivo'] : ['facturaId', 'motivo'];
  const required = partial ? [] : ['facturaId', 'motivo'];
  const error = validateBody(body, fields, required, partial);
  if (error) return error;
  if (Object.hasOwn(body, 'facturaId') && !parseId(body.facturaId)) return 'facturaId debe ser un entero positivo.';
  if (Object.hasOwn(body, 'motivo') && !isValidName(body.motivo)) return 'Indicá un motivo de devolución de hasta 150 caracteres.';
  return null;
}

async function listar(_req, res) {
  const returns = await Devolucion.findAll({ include, order: [['fecha', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: returns.map(serialize) });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const returnRecord = await Devolucion.findByPk(id, { include });
  if (!returnRecord) return res.status(404).json({ error: 'No se encontró la devolución.' });
  return res.status(200).json({ data: serialize(returnRecord) });
}

async function crear(req, res) {
  const error = validate(req.body, false);
  if (error) return res.status(400).json({ error });
  const returnRecord = await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(req.body.facturaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice) throw httpError(404, 'No se encontró la factura indicada.');
    if (invoice.estado !== 'confirmada') throw httpError(409, 'Solo se pueden registrar devoluciones de ventas confirmadas.');
    return Devolucion.create({ facturaId: invoice.id, usuarioId: req.auth.usuarioId, motivo: req.body.motivo.trim(), estado: 'borrador' }, { transaction });
  });
  return res.status(201).json({ data: returnRecord });
}

async function update(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const error = validate(req.body, partial);
  if (error) return res.status(400).json({ error });
  const returnRecord = await sequelize.transaction(async (transaction) => {
    const current = await Devolucion.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!current) throw httpError(404, 'No se encontró la devolución.');
    if (current.estado !== 'borrador') throw httpError(409, 'No se puede editar una devolución procesada.');
    if (!partial && Number(req.body.facturaId) !== current.facturaId) throw httpError(400, 'No se puede cambiar la factura asociada a una devolución.');
    await current.update({ motivo: req.body.motivo.trim() }, { transaction });
    return current;
  });
  return res.status(200).json({ data: returnRecord });
}

async function actualizar(req, res) { return update(req, res, false); }
async function actualizarParcial(req, res) { return update(req, res, true); }

async function procesar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const snapshot = await Devolucion.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró la devolución.' });
  await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(snapshot.facturaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice || invoice.estado !== 'confirmada') throw httpError(409, 'La factura asociada ya no está confirmada.');
    const returnRecord = await Devolucion.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!returnRecord) throw httpError(404, 'No se encontró la devolución.');
    if (returnRecord.estado !== 'borrador') throw httpError(409, 'La devolución ya fue procesada.');
    const lines = await DetalleDevolucion.findAll({
      where: { devolucionId: id },
      include: [{ model: DetalleFactura, as: 'detalleFactura' }],
      transaction,
      order: [['id', 'ASC']]
    });
    if (!lines.length) throw httpError(409, 'Agregá al menos una línea antes de procesar la devolución.');

    for (const line of lines) {
      const soldLine = line.detalleFactura;
      if (!soldLine || soldLine.facturaId !== invoice.id) throw httpError(409, 'Una de las líneas no pertenece a la factura de esta devolución.');
      const processed = await DetalleDevolucion.findAll({
        where: { detalleFacturaId: soldLine.id },
        include: [{ model: Devolucion, as: 'devolucion', attributes: [], where: { estado: 'procesada' } }],
        transaction
      });
      const returned = processed.reduce((sum, previous) => sum + toMilli(previous.cantidad), 0);
      if (returned + toMilli(line.cantidad) > toMilli(soldLine.cantidad)) throw httpError(409, `La cantidad devuelta supera lo vendido en la línea #${soldLine.id}.`);
      const stock = await Existencia.findOne({ where: { productoId: soldLine.productoId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) throw httpError(409, `El producto #${soldLine.productoId} no tiene un registro de existencias.`);
      const next = toMilli(stock.cantidadActual) + toMilli(line.cantidad);
      await stock.update({ cantidadActual: fromMilli(next) }, { transaction });
      await MovimientoInventario.create({
        productoId: soldLine.productoId,
        usuarioId: req.auth.usuarioId,
        devolucionId: id,
        tipo: 'devolucion',
        cantidad: line.cantidad,
        nota: `Devolución procesada #${id}`
      }, { transaction });
    }
    await returnRecord.update({ estado: 'procesada' }, { transaction });
  });
  const returnRecord = await Devolucion.findByPk(id, { include });
  return res.status(200).json({ data: serialize(returnRecord) });
}

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  await sequelize.transaction(async (transaction) => {
    const returnRecord = await Devolucion.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!returnRecord) throw httpError(404, 'No se encontró la devolución.');
    if (returnRecord.estado !== 'borrador') throw httpError(409, 'No se puede eliminar una devolución procesada; su movimiento de inventario queda como historial.');
    await returnRecord.destroy({ transaction });
  });
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, procesar, eliminar };
