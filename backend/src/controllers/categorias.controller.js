const { Categoria } = require('../../models');
const createCrudController = require('./create-crud-controller');
const { isValidName } = require('../utils/validation');

module.exports = createCrudController({
  Model: Categoria,
  fields: ['nombre', 'descripcion', 'activa'],
  required: ['nombre'],
  notFound: 'No se encontró la categoría.',
  validate(body) {
    if (Object.hasOwn(body, 'nombre') && !isValidName(body.nombre)) return 'El nombre debe tener entre 1 y 150 caracteres.';
    if (Object.hasOwn(body, 'descripcion') && body.descripcion !== null && typeof body.descripcion !== 'string') return 'La descripción debe ser texto o null.';
    if (Object.hasOwn(body, 'activa') && typeof body.activa !== 'boolean') return 'activa debe ser un valor booleano.';
    return null;
  },
  normalize(body) {
    const data = { ...body };
    if (typeof data.nombre === 'string') data.nombre = data.nombre.trim();
    if (typeof data.descripcion === 'string') data.descripcion = data.descripcion.trim() || null;
    return data;
  }
});
