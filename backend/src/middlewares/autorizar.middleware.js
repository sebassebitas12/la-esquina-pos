function autorizarPorMetodo(req, res, next) {
  if (req.auth?.rol === 'administrador') return next();
  if (req.auth?.rol === 'lector' && (req.method === 'GET' || req.method === 'HEAD')) return next();
  return res.status(403).json({ error: 'Tu rol no tiene permiso para realizar esta operación.' });
}

module.exports = autorizarPorMetodo;
