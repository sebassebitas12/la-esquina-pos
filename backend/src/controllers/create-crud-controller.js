const { parseId, validateBody } = require('../utils/validation');

function createCrudController({
  Model,
  fields,
  required = [],
  include = [],
  validate = () => null,
  normalize = (body) => body,
  notFound = 'No se encontró el registro.'
}) {
  async function validateInput(body, partial) {
    const error = validateBody(body, fields, partial ? [] : required, partial);
    if (error) return error;
    return validate(body, partial);
  }

  function sendValidationError(res, error) {
    if (!error) return false;
    if (typeof error === 'string') res.status(400).json({ error });
    else res.status(error.status || 400).json({ error: error.message });
    return true;
  }

  return {
    async listar(_req, res) {
      const records = await Model.findAll({ include, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
      return res.status(200).json({ data: records });
    },

    async obtener(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
      const record = await Model.findByPk(id, { include });
      if (!record) return res.status(404).json({ error: notFound });
      return res.status(200).json({ data: record });
    },

    async crear(req, res) {
      const error = await validateInput(req.body, false);
      if (sendValidationError(res, error)) return;
      const record = await Model.create(normalize(req.body));
      return res.status(201).json({ data: record });
    },

    async actualizar(req, res) {
      return update(req, res, false);
    },

    async actualizarParcial(req, res) {
      return update(req, res, true);
    },

    async eliminar(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
      const record = await Model.findByPk(id);
      if (!record) return res.status(404).json({ error: notFound });
      await record.destroy();
      return res.status(204).end();
    }
  };

  async function update(req, res, partial) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
    const record = await Model.findByPk(id);
    if (!record) return res.status(404).json({ error: notFound });
    const error = await validateInput(req.body, partial);
    if (sendValidationError(res, error)) return;
    await record.update(normalize(req.body));
    return res.status(200).json({ data: record });
  }
}

module.exports = createCrudController;
