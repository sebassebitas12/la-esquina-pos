module.exports = (sequelize, DataTypes) => sequelize.define('Compra', {
  proveedorId: { type: DataTypes.INTEGER, allowNull: false, field: 'proveedor_id' },
  usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: 'usuario_id' },
  fecha: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  fechaRecepcion: { type: DataTypes.DATE, allowNull: true, field: 'fecha_recepcion' },
  estado: { type: DataTypes.ENUM('borrador', 'recibida', 'anulada'), allowNull: false, defaultValue: 'borrador' },
  observaciones: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'compras', underscored: true });
