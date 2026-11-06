module.exports = (sequelize, DataTypes) => sequelize.define('DetalleDevolucion', {
  devolucionId: { type: DataTypes.INTEGER, allowNull: false, field: 'devolucion_id' },
  detalleFacturaId: { type: DataTypes.INTEGER, allowNull: false, field: 'detalle_factura_id' },
  cantidad: { type: DataTypes.DECIMAL(12, 3), allowNull: false, validate: { min: 0.001 } },
  precioUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'precio_unitario', validate: { min: 0 } }
}, { tableName: 'detalles_devolucion', underscored: true, indexes: [{ unique: true, fields: ['devolucion_id', 'detalle_factura_id'] }] });
