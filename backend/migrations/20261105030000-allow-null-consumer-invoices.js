'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE `facturas` MODIFY COLUMN `cliente_id` INTEGER NULL');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE `facturas` MODIFY COLUMN `cliente_id` INTEGER NOT NULL');
  }
};
