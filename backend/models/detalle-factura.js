module.exports = (sequelize, DataTypes) => sequelize.define('DetalleFactura', {
  facturaId: { type: DataTypes.INTEGER, allowNull: false, field: 'factura_id' },
  productoId: { type: DataTypes.INTEGER, allowNull: false, field: 'producto_id' },
  cantidad: { type: DataTypes.DECIMAL(12, 3), allowNull: false, validate: { min: 0.001 } },
  precioUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'precio_unitario', validate: { min: 0 } }
}, { tableName: 'detalle_factura', underscored: true });
