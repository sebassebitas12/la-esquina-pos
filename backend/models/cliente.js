module.exports = (sequelize, DataTypes) => sequelize.define('Cliente', {
  nombre: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true, len: [1, 150] } },
  correo: { type: DataTypes.STRING(254), allowNull: true, validate: { isEmail: true, len: [1, 254] } },
  telefono: { type: DataTypes.STRING(30), allowNull: true, validate: { len: [1, 30] } }
}, { tableName: 'clientes', underscored: true });
