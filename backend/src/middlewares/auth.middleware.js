const jwt = require('jsonwebtoken');
const { Usuario, Rol } = require('../../models');
const { parseId } = require('../utils/validation');

function noAutorizado(res) {
  return res.status(401).json({ error: 'No autorizado' });
}

async function autenticar(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match || !process.env.JWT_SECRET) return noAutorizado(res);

  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return noAutorizado(res);
  }

  const usuarioId = parseId(payload.sub);
  if (!usuarioId) return noAutorizado(res);

  const usuario = await Usuario.findByPk(usuarioId, {
    include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }]
  });
  if (!usuario || !['administrador', 'lector'].includes(usuario.rol?.nombre)) return noAutorizado(res);

  req.auth = { usuarioId, rol: usuario.rol.nombre };
  return next();
}

module.exports = autenticar;
