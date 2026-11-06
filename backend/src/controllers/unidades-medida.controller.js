const { UnidadMedida } = require('../../models');
const createCrudController = require('./create-crud-controller');
const { isValidName } = require('../utils/validation');

module.exports = createCrudController({
  Model: UnidadMedida,
  fields: ['nombre', 'abreviatura', 'activa'],
  required: ['nombre', 'abreviatura'],
  notFound: 'No se encontró la unidad de medida.',
  validate(body) {
    if (Object.hasOwn(body, 'nombre') && !isValidName(body.nombre)) return 'El nombre debe tener entre 1 y 150 caracteres.';
    if (Object.hasOwn(body, 'abreviatura') && (typeof body.abreviatura !== 'string' || !body.abreviatura.trim() || body.abreviatura.trim().length > 12)) return 'La abreviatura debe tener entre 1 y 12 caracteres.';
    if (Object.hasOwn(body, 'activa') && typeof body.activa !== 'boolean') return 'activa debe ser un valor booleano.';
    return null;
  },
  normalize(body) {
    const data = { ...body };
    if (typeof data.nombre === 'string') data.nombre = data.nombre.trim();
    if (typeof data.abreviatura === 'string') data.abreviatura = data.abreviatura.trim();
    return data;
  }
});
