const jwt = require('jsonwebtoken');
const { parseId } = require('../utils/validation');

function noAutorizado(res) {
  return res.status(401).json({ error: 'No autorizado' });
}

function autenticar(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match || !process.env.JWT_SECRET) return noAutorizado(res);

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const usuarioId = parseId(payload.sub);
    if (!usuarioId) return noAutorizado(res);
    req.auth = { usuarioId };
    return next();
  } catch {
    return noAutorizado(res);
  }
}

module.exports = autenticar;
