const { Op } = require('sequelize');
const { sequelize, MovimientoInventario, Producto, Usuario, Compra, Factura, Devolucion, Existencia } = require('../../models');
const { parseId, validateBody } = require('../utils/validation');
const { isValidQuantity, toMilli, fromMilli } = require('../utils/quantity');
const httpError = require('../utils/http-error');

const fields = ['productoId', 'tipo', 'cantidad', 'nota'];
const include = [
  { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'sku'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
  { model: Compra, as: 'compra', attributes: ['id', 'fecha', 'estado'] },
  { model: Factura, as: 'factura', attributes: ['id', 'fecha', 'estado'] },
  { model: Devolucion, as: 'devolucion', attributes: ['id', 'fecha', 'estado'] }
];

function validate(body) {
  const error = validateBody(body, fields, ['productoId', 'tipo', 'cantidad']);
  if (error) return error;
  if (!parseId(body.productoId)) return 'productoId debe ser un entero positivo.';
  if (!['entrada', 'salida', 'ajuste'].includes(body.tipo)) return 'tipo debe ser entrada, salida o ajuste.';
  const signed = body.tipo === 'ajuste';
  if (!isValidQuantity(body.cantidad, { allowNegative: signed })) return signed ? 'El ajuste debe ser distinto de cero y tener hasta tres decimales.' : 'La cantidad debe ser mayor a cero y tener hasta tres decimales.';
  if (body.nota !== null && typeof body.nota !== 'string') return 'nota debe ser texto o null.';
  if (typeof body.nota === 'string' && body.nota.length > 255) return 'La nota no puede superar 255 caracteres.';
  if (body.tipo === 'ajuste' && (!body.nota || !body.nota.trim())) return 'Indicá el motivo del ajuste.';
  return null;
}

async function listar(req, res) {
  const where = {};
  if (req.query.productoId !== undefined) {
    const productId = parseId(req.query.productoId);
    if (!productId) return res.status(400).json({ error: 'productoId debe ser un entero positivo.' });
    where.productoId = productId;
  }
  if (req.query.tipo !== undefined) {
    if (!['entrada', 'salida', 'ajuste', 'devolucion'].includes(req.query.tipo)) return res.status(400).json({ error: 'El tipo de movimiento no es válido.' });
    where.tipo = req.query.tipo;
  }
  const movements = await MovimientoInventario.findAll({ where, include, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: movements });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const movement = await MovimientoInventario.findByPk(id, { include });
  if (!movement) return res.status(404).json({ error: 'No se encontró el movimiento de inventario.' });
  return res.status(200).json({ data: movement });
}

async function crear(req, res) {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error });
  const created = await sequelize.transaction(async (transaction) => {
    const product = await Producto.findByPk(req.body.productoId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!product) throw httpError(404, 'No se encontró el producto indicado.');
    const stock = await Existencia.findOne({ where: { productoId: product.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!stock) throw httpError(409, 'El producto no tiene un registro de existencias.');
    const amount = toMilli(req.body.cantidad);
    const delta = req.body.tipo === 'entrada' ? amount : req.body.tipo === 'salida' ? -amount : amount;
    const next = toMilli(stock.cantidadActual) + delta;
    if (next < 0) throw httpError(409, 'El movimiento dejaría las existencias por debajo de cero.');
    await stock.update({ cantidadActual: fromMilli(next) }, { transaction });
    return MovimientoInventario.create({
      productoId: product.id,
      usuarioId: req.auth.usuarioId,
      tipo: req.body.tipo,
      cantidad: String(req.body.cantidad),
      nota: typeof req.body.nota === 'string' ? req.body.nota.trim() || null : null
    }, { transaction });
  });
  const movement = await MovimientoInventario.findByPk(created.id, { include });
  return res.status(201).json({ data: movement });
}

async function noModificar(_req, res) {
  return res.status(409).json({ error: 'Los movimientos son un historial inmutable; registrá un nuevo ajuste para corregir el saldo.' });
}

module.exports = { crear, listar, obtener, actualizar: noModificar, actualizarParcial: noModificar, eliminar: noModificar };
