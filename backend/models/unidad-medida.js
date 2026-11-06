module.exports = (sequelize, DataTypes) => sequelize.define('UnidadMedida', {
  nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true, validate: { notEmpty: true, len: [1, 80] } },
  abreviatura: { type: DataTypes.STRING(12), allowNull: false, unique: true, validate: { notEmpty: true, len: [1, 12] } },
  activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'unidades_medida', underscored: true });
