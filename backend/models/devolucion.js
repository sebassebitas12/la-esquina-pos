module.exports = (sequelize, DataTypes) => sequelize.define('Devolucion', {
  facturaId: { type: DataTypes.INTEGER, allowNull: false, field: 'factura_id' },
  usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: 'usuario_id' },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  motivo: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true, len: [1, 255] } },
  estado: { type: DataTypes.ENUM('borrador', 'procesada'), allowNull: false, defaultValue: 'borrador' }
}, { tableName: 'devoluciones', underscored: true });
