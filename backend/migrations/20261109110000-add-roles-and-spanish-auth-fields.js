'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('usuarios', 'password_hash', 'contrasena_hash');
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: Sequelize.STRING(40), allowNull: false },
      descripcion: { type: Sequelize.STRING(180), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('roles', ['nombre'], { unique: true, name: 'roles_nombre_unique' });

    const now = new Date();
    await queryInterface.bulkInsert('roles', [
      { id: 1, nombre: 'administrador', descripcion: 'Puede consultar y modificar los registros del sistema.', created_at: now, updated_at: now },
      { id: 2, nombre: 'lector', descripcion: 'Puede consultar los registros y usar el asistente.', created_at: now, updated_at: now }
    ]);

    await queryInterface.addColumn('usuarios', 'rol_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'roles', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    await queryInterface.sequelize.query('UPDATE `usuarios` SET `rol_id` = 2 WHERE `rol_id` IS NULL');
    await queryInterface.changeColumn('usuarios', 'rol_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('usuarios', 'rol_id');
    await queryInterface.renameColumn('usuarios', 'contrasena_hash', 'password_hash');
    await queryInterface.dropTable('roles');
  }
};
