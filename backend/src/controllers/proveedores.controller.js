const { Proveedor } = require('../../models');
const createCrudController = require('./create-crud-controller');
const { isValidName } = require('../utils/validation');

module.exports = createCrudController({
  Model: Proveedor,
  fields: ['nombre', 'identificacion', 'contacto', 'correo', 'telefono', 'direccion', 'activo'],
  required: ['nombre'],
  notFound: 'No se encontró el proveedor.',
  validate(body) {
    if (Object.hasOwn(body, 'nombre') && !isValidName(body.nombre)) return 'El nombre del proveedor debe tener entre 1 y 150 caracteres.';
    if (Object.hasOwn(body, 'correo') && body.correo !== null && body.correo !== '' && (typeof body.correo !== 'string' || body.correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.correo))) return 'El correo del proveedor no es válido.';
    for (const key of ['identificacion', 'contacto', 'telefono', 'direccion']) {
      if (Object.hasOwn(body, key) && body[key] !== null && typeof body[key] !== 'string') return `${key} debe ser texto o null.`;
    }
    if (Object.hasOwn(body, 'activo') && typeof body.activo !== 'boolean') return 'activo debe ser un valor booleano.';
    return null;
  },
  normalize(body) {
    const data = { ...body };
    for (const key of ['nombre', 'identificacion', 'contacto', 'correo', 'telefono', 'direccion']) {
      if (typeof data[key] === 'string') data[key] = data[key].trim() || (key === 'nombre' ? '' : null);
    }
    return data;
  }
});
