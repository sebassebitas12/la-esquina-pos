module.exports = (sequelize, DataTypes) => sequelize.define('Categoria', {
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { notEmpty: true, len: [1, 100] } },
  descripcion: { type: DataTypes.STRING(255), allowNull: true },
  activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'categorias', underscored: true });
