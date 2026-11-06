module.exports = (sequelize, DataTypes) => sequelize.define('MetodoPago', {
  codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true, validate: { notEmpty: true, len: [1, 30] } },
  nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true, validate: { notEmpty: true, len: [1, 80] } },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'metodos_pago', underscored: true });
