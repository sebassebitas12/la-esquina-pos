const express = require('express');
const controller = require('../controllers/auth.controller');
const autenticar = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', controller.registrar);
router.post('/login', controller.iniciarSesion);
router.get('/me', autenticar, controller.obtenerSesion);

module.exports = router;
