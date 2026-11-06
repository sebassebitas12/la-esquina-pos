'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `clientes` ADD CONSTRAINT `chk_clientes_nombre_no_vacio` CHECK (CHAR_LENGTH(TRIM(`nombre`)) > 0)'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `productos` ADD CONSTRAINT `chk_productos_nombre_no_vacio` CHECK (CHAR_LENGTH(TRIM(`nombre`)) > 0), ADD CONSTRAINT `chk_productos_precio_no_negativo` CHECK (`precio` >= 0)'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `detalle_factura` ADD CONSTRAINT `chk_detalle_factura_cantidad_positiva` CHECK (`cantidad` > 0), ADD CONSTRAINT `chk_detalle_factura_precio_no_negativo` CHECK (`precio_unitario` >= 0)'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `detalle_factura` DROP CHECK `chk_detalle_factura_precio_no_negativo`, DROP CHECK `chk_detalle_factura_cantidad_positiva`'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `productos` DROP CHECK `chk_productos_precio_no_negativo`, DROP CHECK `chk_productos_nombre_no_vacio`'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `clientes` DROP CHECK `chk_clientes_nombre_no_vacio`'
    );
  }
};
