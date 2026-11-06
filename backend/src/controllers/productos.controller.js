const {
  sequelize,
  Producto,
  Categoria,
  Marca,
  UnidadMedida,
  Existencia,
  DetalleFactura,
  DetalleCompra,
  ProductoProveedor,
  MovimientoInventario
} = require('../../models');
const { parseId, validateBody, isValidName, isValidMoney } = require('../utils/validation');

const fields = ['nombre', 'precio', 'sku', 'codigoBarras', 'categoriaId', 'marcaId', 'unidadMedidaId', 'descripcion', 'activo'];
const required = ['nombre', 'precio', 'sku', 'categoriaId', 'unidadMedidaId'];
const include = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
  { model: Marca, as: 'marca', attributes: ['id', 'nombre'] },
  { model: UnidadMedida, as: 'unidadMedida', attributes: ['id', 'nombre', 'abreviatura'] },
  { model: Existencia, as: 'existencia', attributes: ['cantidadActual', 'cantidadMinima'] }
];

function validateProducto(body, partial = false) {
  const error = validateBody(body, fields, partial ? [] : required, partial);
  if (error) return error;
  if (Object.hasOwn(body, 'nombre') && !isValidName(body.nombre)) return 'El nombre debe tener entre 1 y 150 caracteres.';
  if (Object.hasOwn(body, 'precio') && (!isValidMoney(body.precio) || Number(body.precio) < 0)) return 'El precio debe ser un monto igual o mayor a cero con hasta dos decimales.';
  if (Object.hasOwn(body, 'sku') && (typeof body.sku !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(body.sku.trim()))) return 'El SKU debe tener entre 1 y 40 letras, números, guiones o guiones bajos.';
  if (Object.hasOwn(body, 'codigoBarras') && body.codigoBarras !== null && body.codigoBarras !== '' && (typeof body.codigoBarras !== 'string' || !/^\d{8,14}$/.test(body.codigoBarras))) return 'El código de barras debe tener entre 8 y 14 dígitos.';
  if (Object.hasOwn(body, 'descripcion') && body.descripcion !== null && (typeof body.descripcion !== 'string' || body.descripcion.length > 255)) return 'La descripción no puede superar 255 caracteres.';
  for (const key of ['categoriaId', 'unidadMedidaId']) {
    if (Object.hasOwn(body, key) && !parseId(body[key])) return `${key} debe ser un entero positivo.`;
  }
  if (Object.hasOwn(body, 'marcaId') && body.marcaId !== null && !parseId(body.marcaId)) return 'marcaId debe ser un entero positivo o null.';
  if (Object.hasOwn(body, 'activo') && typeof body.activo !== 'boolean') return 'activo debe ser un valor booleano.';
  return null;
}

async function validateReferences(body) {
  if (Object.hasOwn(body, 'categoriaId')) {
    const category = await Categoria.findByPk(body.categoriaId);
    if (!category) return { status: 404, message: 'No se encontró la categoría indicada.' };
    if (!category.activa) return { status: 409, message: 'La categoría indicada está inactiva.' };
  }
  if (Object.hasOwn(body, 'marcaId') && body.marcaId !== null) {
    const brand = await Marca.findByPk(body.marcaId);
    if (!brand) return { status: 404, message: 'No se encontró la marca indicada.' };
    if (!brand.activa) return { status: 409, message: 'La marca indicada está inactiva.' };
  }
  if (Object.hasOwn(body, 'unidadMedidaId')) {
    const unit = await UnidadMedida.findByPk(body.unidadMedidaId);
    if (!unit) return { status: 404, message: 'No se encontró la unidad de medida indicada.' };
    if (!unit.activa) return { status: 409, message: 'La unidad de medida indicada está inactiva.' };
  }
  return null;
}

function normalizeProducto(body) {
  const data = { ...body };
  if (typeof data.nombre === 'string') data.nombre = data.nombre.trim();
  if (data.precio !== undefined) data.precio = String(data.precio);
  if (typeof data.sku === 'string') data.sku = data.sku.trim().toUpperCase();
  if (typeof data.codigoBarras === 'string') data.codigoBarras = data.codigoBarras.trim() || null;
  if (typeof data.descripcion === 'string') data.descripcion = data.descripcion.trim() || null;
  for (const key of ['categoriaId', 'marcaId', 'unidadMedidaId']) {
    if (data[key] !== undefined && data[key] !== null) data[key] = Number(data[key]);
  }
  return data;
}

async function validarBody(req, partial) {
  const error = validateProducto(req.body, partial);
  if (error) return error;
  return validateReferences(req.body);
}

function sendValidationError(res, error) {
  if (!error) return false;
  if (typeof error === 'string') res.status(400).json({ error });
  else res.status(error.status || 400).json({ error: error.message });
  return true;
}

async function listar(_req, res) {
  const productos = await Producto.findAll({ include, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  return res.status(200).json({ data: productos });
}

async function obtener(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const producto = await Producto.findByPk(id, { include });
  if (!producto) return res.status(404).json({ error: 'No se encontró el producto.' });
  return res.status(200).json({ data: producto });
}

async function crear(req, res) {
  const error = await validarBody(req, false);
  if (sendValidationError(res, error)) return;
  const producto = await sequelize.transaction(async (transaction) => {
    const created = await Producto.create(normalizeProducto(req.body), { transaction });
    await Existencia.create({ productoId: created.id, cantidadActual: 0, cantidadMinima: 0 }, { transaction });
    return created;
  });
  return res.status(201).json({ data: producto });
}

async function actualizarProducto(req, res, partial) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  const producto = await Producto.findByPk(id);
  if (!producto) return res.status(404).json({ error: 'No se encontró el producto.' });
  const error = await validarBody(req, partial);
  if (sendValidationError(res, error)) return;
  await producto.update(normalizeProducto(req.body));
  return res.status(200).json({ data: producto });
}

async function actualizar(req, res) { return actualizarProducto(req, res, false); }
async function actualizarParcial(req, res) { return actualizarProducto(req, res, true); }

async function eliminar(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
  await sequelize.transaction(async (transaction) => {
    const product = await Producto.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!product) {
      const error = new Error('No se encontró el producto.');
      error.status = 404;
      throw error;
    }
    const [saleLines, purchaseLines, supplierLinks, movements, stock] = await Promise.all([
      DetalleFactura.count({ where: { productoId: id }, transaction }),
      DetalleCompra.count({ where: { productoId: id }, transaction }),
      ProductoProveedor.count({ where: { productoId: id }, transaction }),
      MovimientoInventario.count({ where: { productoId: id }, transaction }),
      Existencia.findOne({ where: { productoId: id }, transaction, lock: transaction.LOCK.UPDATE })
    ]);
    if (saleLines || purchaseLines || supplierLinks || movements || Number(stock?.cantidadActual || 0) !== 0) {
      const error = new Error('No se puede eliminar: el producto tiene historial, relaciones o existencias. Podés desactivarlo con PATCH.');
      error.status = 409;
      throw error;
    }
    await product.destroy({ transaction });
  });
  return res.status(204).end();
}

module.exports = { crear, listar, obtener, actualizar, actualizarParcial, eliminar };
