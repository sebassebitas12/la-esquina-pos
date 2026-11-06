module.exports = (sequelize, DataTypes) => sequelize.define('DetalleCompra', {
  compraId: { type: DataTypes.INTEGER, allowNull: false, field: 'compra_id' },
  productoId: { type: DataTypes.INTEGER, allowNull: false, field: 'producto_id' },
  cantidad: { type: DataTypes.DECIMAL(12, 3), allowNull: false, validate: { min: 0.001 } },
  costoUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'costo_unitario', validate: { min: 0 } }
}, { tableName: 'detalles_compra', underscored: true, indexes: [{ unique: true, fields: ['compra_id', 'producto_id'] }] });
