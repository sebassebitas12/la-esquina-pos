module.exports = (sequelize, DataTypes) => sequelize.define('Rol', {
  nombre: { type: DataTypes.STRING(40), allowNull: false, unique: { name: 'roles_nombre_unique' } },
  descripcion: { type: DataTypes.STRING(180), allowNull: false }
}, { tableName: 'roles', underscored: true });
