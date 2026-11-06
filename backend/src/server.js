const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = require('./app');
const { sequelize } = require('../models');

const port = Number(process.env.PORT || 3000);

async function start() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('Configurá JWT_SECRET con al menos 32 caracteres en backend/.env.');
    }
    await sequelize.authenticate();
    app.listen(port, () => console.log(`API disponible en http://localhost:${port}/api`));
  } catch (error) {
    console.error('No se pudo conectar a MySQL:', error.message);
    process.exitCode = 1;
  }
}

start();
