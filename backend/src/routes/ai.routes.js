const express = require('express');
const controller = require('../controllers/ai.controller');

const router = express.Router();

router.post('/consulta', controller.consulta);

module.exports = router;
