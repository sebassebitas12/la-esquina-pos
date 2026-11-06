module.exports = (sequelize, DataTypes) => sequelize.define('Factura', {
  clienteId: { type: DataTypes.INTEGER, allowNull: true, field: 'cliente_id' },
  usuarioId: { type: DataTypes.INTEGER, allowNull: true, field: 'usuario_id' },
  fecha: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  fechaConfirmacion: { type: DataTypes.DATE, allowNull: true, field: 'fecha_confirmacion' },
  estado: { type: DataTypes.ENUM('borrador', 'confirmada', 'anulada'), allowNull: false, defaultValue: 'borrador' }
}, { tableName: 'facturas', underscored: true });
