const { sequelize, Usuario, Rol } = require('../models');

function readArguments(argumentsList) {
  const values = {};
  for (const argument of argumentsList) {
    const match = argument.match(/^--(correo|rol)=(.+)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

async function main() {
  const { correo, rol: nombreRol } = readArguments(process.argv.slice(2));
  const rolesPermitidos = new Set(['administrador', 'lector']);
  if (!correo || !rolesPermitidos.has(nombreRol)) {
    throw new Error('Uso: npm run usuario:asignar-rol -- --correo=cuenta@ejemplo.com --rol=administrador|lector');
  }

  const usuario = await Usuario.findOne({ where: { correo: correo.trim().toLowerCase() } });
  if (!usuario) throw new Error('No existe una cuenta con ese correo. Registrala antes de asignarle un rol.');
  const rol = await Rol.findOne({ where: { nombre: nombreRol } });
  if (!rol) throw new Error('No existe el rol solicitado. Ejecutá las migraciones primero.');

  await usuario.update({ rolId: rol.id });
  process.stdout.write(`Rol ${rol.nombre} asignado a ${usuario.correo}.\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
