const { MetodoPago } = require('../../models');
const createCrudController = require('./create-crud-controller');
const { isValidName } = require('../utils/validation');

module.exports = createCrudController({
  Model: MetodoPago,
  fields: ['codigo', 'nombre', 'activo'],
  required: ['codigo', 'nombre'],
  notFound: 'No se encontró el método de pago.',
  validate(body) {
    if (Object.hasOwn(body, 'codigo') && (typeof body.codigo !== 'string' || !body.codigo.trim() || body.codigo.trim().length > 30)) return 'El código debe tener entre 1 y 30 caracteres.';
    if (Object.hasOwn(body, 'nombre') && !isValidName(body.nombre)) return 'El nombre debe tener entre 1 y 150 caracteres.';
    if (Object.hasOwn(body, 'activo') && typeof body.activo !== 'boolean') return 'activo debe ser un valor booleano.';
    return null;
  },
  normalize(body) {
    const data = { ...body };
    if (typeof data.codigo === 'string') data.codigo = data.codigo.trim().toLowerCase();
    if (typeof data.nombre === 'string') data.nombre = data.nombre.trim();
    return data;
  }
});
