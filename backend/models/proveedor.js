module.exports = (sequelize, DataTypes) => sequelize.define('Proveedor', {
  nombre: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true, len: [1, 150] } },
  identificacion: { type: DataTypes.STRING(30), allowNull: true, unique: true },
  contacto: { type: DataTypes.STRING(150), allowNull: true },
  correo: { type: DataTypes.STRING(254), allowNull: true, validate: { isEmail: true } },
  telefono: { type: DataTypes.STRING(30), allowNull: true },
  direccion: { type: DataTypes.STRING(255), allowNull: true },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'proveedores', underscored: true });
