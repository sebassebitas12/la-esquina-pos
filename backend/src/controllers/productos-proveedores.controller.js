const { ProductoProveedor, Proveedor, Producto } = require('../../models');
const createCrudController = require('./create-crud-controller');
const { parseId, isValidMoney } = require('../utils/validation');

module.exports = createCrudController({
  Model: ProductoProveedor,
  fields: ['proveedorId', 'productoId', 'codigoProveedor', 'costoUnitario', 'preferido'],
  required: ['proveedorId', 'productoId', 'costoUnitario'],
  include: [{ model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] }, { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'sku'] }],
  notFound: 'No se encontró la relación entre proveedor y producto.',
  async validate(body) {
    for (const key of ['proveedorId', 'productoId']) {
      if (Object.hasOwn(body, key) && !parseId(body[key])) return `${key} debe ser un entero positivo.`;
    }
    if (Object.hasOwn(body, 'costoUnitario') && !isValidMoney(body.costoUnitario)) return 'El costo debe ser un monto con hasta dos decimales.';
    if (Object.hasOwn(body, 'codigoProveedor') && body.codigoProveedor !== null && typeof body.codigoProveedor !== 'string') return 'codigoProveedor debe ser texto o null.';
    if (Object.hasOwn(body, 'preferido') && typeof body.preferido !== 'boolean') return 'preferido debe ser un valor booleano.';
    if (Object.hasOwn(body, 'proveedorId') && !(await Proveedor.findByPk(body.proveedorId))) return { status: 404, message: 'No se encontró el proveedor indicado.' };
    if (Object.hasOwn(body, 'productoId') && !(await Producto.findByPk(body.productoId))) return { status: 404, message: 'No se encontró el producto indicado.' };
    return null;
  },
  normalize(body) {
    const data = { ...body };
    for (const key of ['proveedorId', 'productoId']) if (data[key] !== undefined) data[key] = Number(data[key]);
    if (data.costoUnitario !== undefined) data.costoUnitario = String(data.costoUnitario);
    if (typeof data.codigoProveedor === 'string') data.codigoProveedor = data.codigoProveedor.trim() || null;
    return data;
  }
});
