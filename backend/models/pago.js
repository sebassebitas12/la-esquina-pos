module.exports = (sequelize, DataTypes) => sequelize.define('Pago', {
  facturaId: { type: DataTypes.INTEGER, allowNull: false, field: 'factura_id' },
  metodoPagoId: { type: DataTypes.INTEGER, allowNull: false, field: 'metodo_pago_id' },
  usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: 'usuario_id' },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  referencia: { type: DataTypes.STRING(100), allowNull: true },
  estado: { type: DataTypes.ENUM('aplicado', 'anulado'), allowNull: false, defaultValue: 'aplicado' }
}, { tableName: 'pagos', underscored: true });
