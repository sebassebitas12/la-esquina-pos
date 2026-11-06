'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: Sequelize.STRING(150), allowNull: false },
      correo: { type: Sequelize.STRING(254), allowNull: false },
      password_hash: { type: Sequelize.STRING(60), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('usuarios', ['correo'], { unique: true, name: 'usuarios_correo_unique' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  }
};
