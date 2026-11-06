const express = require('express');
const controller = require('../controllers/detalles-factura.controller');

const router = express.Router();

router.post('/', controller.crear);
router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.put('/:id', controller.actualizar);
router.patch('/:id', controller.actualizarParcial);
router.delete('/:id', controller.eliminar);

module.exports = router;
