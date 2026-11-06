const { Cliente, Factura } = require('../../models');
const { parseId } = require('../utils/validation');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCliente(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'El cuerpo debe ser un objeto JSON.';
  if (partial && Object.keys(body).length === 0) return 'Enviá al menos un campo para actualizar.';
  if ((!partial || Object.hasOwn(body, 'nombre')) && (typeof body.nombre !== 'string' || !body.nombre.trim())) {
    return 'El nombre es obligatorio y no puede estar vacío.';
  }
  if (Object.hasOwn(body, 'nombre') && body.nombre.trim().length > 150) return 'El nombre debe tener hasta 150 caracteres.';
  if (Object.hasOwn(body, 'correo') && body.correo !== null && body.correo !== '') {
    if (typeof body.correo !== 'string' || body.correo.trim().length > 254 || !emailPattern.test(body.correo.trim())) {
      return 'El correo debe tener un formato válido y hasta 254 caracteres.';
    }
  }
  if (Object.hasOwn(body, 'telefono') && body.telefono !== null && body.telefono !== '') {
    if (typeof body.telefono !== 'string' || body.telefono.trim().length > 30) return 'El teléfono debe ser texto de hasta 30 caracteres.';
  }
  const allowed = new Set(['nombre', 'correo', 'telefono']);
  if (Object.keys(body).some((key) => !allowed.has(key))) return 'El cuerpo contiene campos no permitidos.';
  return null;
}

function normalizeCliente(body, partial = false) {
  const data = {};
  if (Object.hasOwn(body, 'nombre')) data.nombre = body.nombre.trim();
  if (!partial || Object.hasOwn(body, 'correo')) data.correo = body.correo?.trim() || null;
  if (!partial || Object.hasOwn(body, 'telefono')) data.telefono = body.telefono?.trim() || null;
  return data;
}

async function crear(req, res) {
  const error = validateCliente(req.body);
  if (error) return res.status(400).json({ error });
  const cliente = await Cliente.create(normalizeCliente(req.body));
  return res.status(201).json({ data: cliente });
}

async function listar(_req, res) {
  const clientes = await Cliente.findAll({ order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: clientes });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const cliente = await Cliente.findByPk(id);
  if (!cliente) return res.status(404).json({ error: 'No se encontró el cliente.' });
  return res.status(200).json({ data: cliente });
}

async function actualizarCliente(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const error = validateCliente(req.body, partial);
  if (error) return res.status(400).json({ error });
  const cliente = await Cliente.findByPk(id);
  if (!cliente) return res.status(404).json({ error: 'No se encontró el cliente.' });
  await cliente.update(normalizeCliente(req.body, partial));
  return res.status(200).json({ data: cliente });
}

async function actualizar(req, res) {
  return actualizarCliente(req, res, false);
}

async function actualizarParcial(req, res) {
  return actualizarCliente(req, res, true);
}

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const cliente = await Cliente.findByPk(id);
  if (!cliente) return res.status(404).json({ error: 'No se encontró el cliente.' });
  const facturas = await Factura.count({ where: { clienteId: id } });
  if (facturas > 0) return res.status(409).json({ error: 'No se puede eliminar: el cliente tiene facturas asociadas.' });
  await cliente.destroy();
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, eliminar };
