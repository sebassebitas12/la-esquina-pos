const { Op } = require('sequelize');
const { sequelize, Pago, Factura, DetalleFactura, MetodoPago, Usuario } = require('../../models');
const { parseId, validateBody, isValidMoney } = require('../utils/validation');
const { toCents, lineTotalCents } = require('../utils/money');
const httpError = require('../utils/http-error');

const createFields = ['facturaId', 'metodoPagoId', 'monto', 'referencia'];
const updateFields = ['metodoPagoId', 'monto', 'referencia'];
const include = [
  { model: Factura, as: 'factura', attributes: ['id', 'fecha', 'estado', 'clienteId'] },
  { model: MetodoPago, as: 'metodoPago', attributes: ['id', 'codigo', 'nombre'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }
];

function validate(body, fields, required, partial = false) {
  const error = validateBody(body, fields, partial ? [] : required, partial);
  if (error) return error;
  for (const key of ['facturaId', 'metodoPagoId']) if (Object.hasOwn(body, key) && !parseId(body[key])) return `${key} debe ser un entero positivo.`;
  if (Object.hasOwn(body, 'monto') && (!isValidMoney(body.monto) || Number(body.monto) <= 0)) return 'El monto debe ser mayor a cero y tener hasta dos decimales.';
  if (Object.hasOwn(body, 'referencia') && body.referencia !== null && (typeof body.referencia !== 'string' || body.referencia.length > 100)) return 'La referencia no puede superar 100 caracteres.';
  return null;
}

async function invoiceTotalCents(invoiceId, transaction) {
  const lines = await DetalleFactura.findAll({ where: { facturaId: invoiceId }, transaction });
  return lines.reduce((sum, line) => sum + lineTotalCents(line.precioUnitario, line.cantidad), 0);
}

async function appliedPaymentCents(invoiceId, transaction, excludedPaymentId) {
  const where = { facturaId: invoiceId, estado: 'aplicado' };
  if (excludedPaymentId) where.id = { [Op.ne]: excludedPaymentId };
  const payments = await Pago.findAll({ where, attributes: ['monto'], transaction });
  return payments.reduce((sum, payment) => sum + toCents(payment.monto), 0);
}

async function validateMethod(methodId, transaction) {
  const method = await MetodoPago.findByPk(methodId, { transaction });
  if (!method || !method.activo) throw httpError(404, 'El método de pago indicado no existe o está inactivo.');
}

async function listar(_req, res) {
  const payments = await Pago.findAll({ include, order: [['fecha', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: payments });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const payment = await Pago.findByPk(id, { include });
  if (!payment) return res.status(404).json({ error: 'No se encontró el pago.' });
  return res.status(200).json({ data: payment });
}

async function crear(req, res) {
  const error = validate(req.body, createFields, ['facturaId', 'metodoPagoId', 'monto']);
  if (error) return res.status(400).json({ error });
  const payment = await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(req.body.facturaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice) throw httpError(404, 'No se encontró la factura indicada.');
    if (invoice.estado !== 'confirmada') throw httpError(409, 'Solo se pueden registrar pagos en facturas confirmadas.');
    await validateMethod(req.body.metodoPagoId, transaction);
    const total = await invoiceTotalCents(invoice.id, transaction);
    const paid = await appliedPaymentCents(invoice.id, transaction);
    const amount = toCents(req.body.monto);
    if (amount > total - paid) throw httpError(409, 'El pago supera el saldo pendiente de la factura.');
    return Pago.create({
      facturaId: invoice.id,
      metodoPagoId: Number(req.body.metodoPagoId),
      usuarioId: req.auth.usuarioId,
      monto: String(req.body.monto),
      referencia: typeof req.body.referencia === 'string' ? req.body.referencia.trim() || null : null,
      estado: 'aplicado'
    }, { transaction });
  });
  const result = await Pago.findByPk(payment.id, { include });
  return res.status(201).json({ data: result });
}

async function update(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const error = validate(req.body, updateFields, ['metodoPagoId', 'monto'], partial);
  if (error) return res.status(400).json({ error });
  const snapshot = await Pago.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró el pago.' });
  await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(snapshot.facturaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice) throw httpError(404, 'No se encontró la factura asociada.');
    const payment = await Pago.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) throw httpError(404, 'No se encontró el pago.');
    if (payment.estado !== 'aplicado') throw httpError(409, 'No se pueden editar pagos anulados.');
    if (invoice.estado !== 'confirmada') throw httpError(409, 'Solo se pueden editar pagos de facturas confirmadas.');
    if (req.body.metodoPagoId !== undefined) await validateMethod(req.body.metodoPagoId, transaction);
    const total = await invoiceTotalCents(invoice.id, transaction);
    const otherPayments = await appliedPaymentCents(invoice.id, transaction, payment.id);
    const nextAmount = req.body.monto === undefined ? toCents(payment.monto) : toCents(req.body.monto);
    if (nextAmount > total - otherPayments) throw httpError(409, 'El monto supera el saldo disponible de la factura.');
    const changes = {};
    if (req.body.metodoPagoId !== undefined) changes.metodoPagoId = Number(req.body.metodoPagoId);
    if (req.body.monto !== undefined) changes.monto = String(req.body.monto);
    if (req.body.referencia !== undefined) changes.referencia = typeof req.body.referencia === 'string' ? req.body.referencia.trim() || null : null;
    await payment.update(changes, { transaction });
  });
  const payment = await Pago.findByPk(id, { include });
  return res.status(200).json({ data: payment });
}

async function actualizar(req, res) { return update(req, res, false); }
async function actualizarParcial(req, res) { return update(req, res, true); }

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const snapshot = await Pago.findByPk(id);
  if (!snapshot) return res.status(404).json({ error: 'No se encontró el pago.' });
  await sequelize.transaction(async (transaction) => {
    const invoice = await Factura.findByPk(snapshot.facturaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!invoice) throw httpError(404, 'No se encontró la factura asociada.');
    const payment = await Pago.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) throw httpError(404, 'No se encontró el pago.');
    if (payment.estado !== 'aplicado') throw httpError(409, 'El pago ya está anulado.');
    if (invoice.estado !== 'confirmada') throw httpError(409, 'Solo se pueden anular pagos de facturas confirmadas.');
    await payment.update({ estado: 'anulado' }, { transaction });
  });
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, eliminar };
