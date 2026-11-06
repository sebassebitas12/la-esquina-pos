const { Usuario, sequelize } = require('../models');

async function removeSmokeUser() {
  const correo = process.argv[2] || '';
  if (!/^usuario\.[a-f0-9]{12}@example\.test$/.test(correo)) {
    throw new Error('Solo se permite limpiar una cuenta temporal generada por las pruebas.');
  }
  await Usuario.destroy({ where: { correo } });
}

removeSmokeUser()
  .catch((error) => {
    console.error('No se pudo limpiar la cuenta temporal:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
