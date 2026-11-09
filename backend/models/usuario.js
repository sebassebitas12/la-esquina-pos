module.exports = (sequelize, DataTypes) => sequelize.define('Usuario', {
  nombre: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true, len: [1, 150] } },
  correo: { type: DataTypes.STRING(254), allowNull: false, unique: { name: 'usuarios_correo_unique', msg: 'El correo ya está registrado.' }, validate: { isEmail: true, len: [1, 254] } },
  contrasenaHash: { type: DataTypes.STRING(60), allowNull: false, field: 'contrasena_hash' },
  rolId: { type: DataTypes.INTEGER, allowNull: false, field: 'rol_id' }
}, { tableName: 'usuarios', underscored: true });
