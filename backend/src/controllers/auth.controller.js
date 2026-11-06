const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../../models');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedFields = new Set(['nombre', 'correo', 'password']);

function validateCredentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'El cuerpo debe ser un objeto JSON.';
  if (Object.keys(body).some((field) => !allowedFields.has(field))) return 'El cuerpo contiene campos no permitidos.';
  if (typeof body.correo !== 'string' || !emailPattern.test(body.correo.trim()) || body.correo.trim().length > 254) {
    return 'Ingresá un correo válido de hasta 254 caracteres.';
  }
  if (typeof body.password !== 'string') return 'La contraseña es obligatoria.';
  if (registration && (body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72)) {
    return 'La contraseña debe tener al menos 8 caracteres y hasta 72 bytes.';
  }
  if (!registration && Buffer.byteLength(body.password, 'utf8') > 72) return 'La contraseña no es válida.';
  if (registration && (typeof body.nombre !== 'string' || !body.nombre.trim() || body.nombre.trim().length > 150)) {
    return 'El nombre es obligatorio y debe tener hasta 150 caracteres.';
  }
  if (!registration && Object.hasOwn(body, 'nombre')) return 'El cuerpo contiene campos no permitidos.';
  return null;
}

function safeUser(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    fechaCreacion: usuario.createdAt
  };
}

function createToken(usuario) {
  return jwt.sign({ sub: String(usuario.id) }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h'
  });
}

async function registrar(req, res) {
  const error = validateCredentials(req.body, true);
  if (error) return res.status(400).json({ error });

  const nombre = req.body.nombre.trim();
  const correo = req.body.correo.trim().toLowerCase();
  const existente = await Usuario.findOne({ where: { correo } });
  if (existente) return res.status(400).json({ error: 'El correo ya está registrado.' });

  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const usuario = await Usuario.create({ nombre, correo, passwordHash });
    return res.status(201).json({ data: safeUser(usuario) });
  } catch (errorCreate) {
    if (errorCreate.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }
    throw errorCreate;
  }
}

async function iniciarSesion(req, res) {
  const error = validateCredentials(req.body);
  if (error) return res.status(400).json({ error });

  const correo = req.body.correo.trim().toLowerCase();
  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario || !(await bcrypt.compare(req.body.password, usuario.passwordHash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  return res.status(200).json({ token: createToken(usuario), usuario: safeUser(usuario) });
}

async function obtenerSesion(req, res) {
  const usuario = await Usuario.findByPk(req.auth.usuarioId);
  if (!usuario) return res.status(401).json({ error: 'No autorizado' });
  return res.status(200).json({ data: safeUser(usuario) });
}

module.exports = { registrar, iniciarSesion, obtenerSesion };
