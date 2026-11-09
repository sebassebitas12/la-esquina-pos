const express = require('express');
const controller = require('../controllers/auth.controller');
const autenticar = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/registro', controller.registrar);
router.post('/iniciar-sesion', controller.iniciarSesion);
router.get('/sesion', autenticar, controller.obtenerSesion);

module.exports = router;
