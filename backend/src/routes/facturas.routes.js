const express = require('express');
const controller = require('../controllers/facturas.controller');

const router = express.Router();

router.post('/', controller.crear);
router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/:id/confirmar', controller.confirmar);
router.post('/:id/anular', controller.anular);
router.put('/:id', controller.actualizar);
router.patch('/:id', controller.actualizarParcial);
router.delete('/:id', controller.eliminar);

module.exports = router;
