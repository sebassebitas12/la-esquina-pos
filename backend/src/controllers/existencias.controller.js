const { Existencia, Producto, Categoria, Marca, UnidadMedida } = require('../../models');
const { parseId, validateBody } = require('../utils/validation');
const { isValidQuantity } = require('../utils/quantity');

const include = [{ model: Producto, as: 'producto', include: [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
  { model: Marca, as: 'marca', attributes: ['id', 'nombre'] },
  { model: UnidadMedida, as: 'unidadMedida', attributes: ['id', 'nombre', 'abreviatura'] }
] }];

function serialize(stock) {
  const data = stock.toJSON();
  data.requiereReposicion = Number(data.cantidadActual) <= Number(data.cantidadMinima);
  return data;
}

async function listar(_req, res) {
  const stocks = await Existencia.findAll({ include, order: [['productoId', 'ASC']] });
  return res.status(200).json({ data: stocks.map(serialize) });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const stock = await Existencia.findByPk(id, { include });
  if (!stock) return res.status(404).json({ error: 'No se encontró la existencia.' });
  return res.status(200).json({ data: serialize(stock) });
}

async function obtenerPorProducto(req, res) {
  const id = parseId(req.params.productoId);
  if (!id) return res.status(400).json({ error: 'El id del producto debe ser un entero positivo.' });
  const stock = await Existencia.findOne({ where: { productoId: id }, include });
  if (!stock) return res.status(404).json({ error: 'No se encontró la existencia del producto.' });
  return res.status(200).json({ data: serialize(stock) });
}

async function actualizarMinimo(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const error = validateBody(req.body, ['cantidadMinima'], ['cantidadMinima']);
  if (error) return res.status(400).json({ error });
  if ((typeof req.body.cantidadMinima !== 'string' && typeof req.body.cantidadMinima !== 'number')
    || !/^\d{1,9}(?:\.\d{1,3})?$/.test(String(req.body.cantidadMinima))) {
    return res.status(400).json({ error: 'cantidadMinima debe ser cero o un número positivo con hasta tres decimales.' });
  }
  const stock = await Existencia.findByPk(id);
  if (!stock) return res.status(404).json({ error: 'No se encontró la existencia.' });
  await stock.update({ cantidadMinima: String(req.body.cantidadMinima) });
  const updated = await Existencia.findByPk(id, { include });
  return res.status(200).json({ data: serialize(updated) });
}

async function eliminar(_req, res) {
  return res.status(409).json({ error: 'No se elimina el registro de existencias; el saldo se conserva mediante movimientos de inventario.' });
}

module.exports = { listar, obtener, obtenerPorProducto, actualizar: actualizarMinimo, actualizarParcial: actualizarMinimo, eliminar };
