module.exports = (sequelize, DataTypes) => sequelize.define('ProductoProveedor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  proveedorId: { type: DataTypes.INTEGER, allowNull: false, field: 'proveedor_id' },
  productoId: { type: DataTypes.INTEGER, allowNull: false, field: 'producto_id' },
  codigoProveedor: { type: DataTypes.STRING(80), allowNull: true, field: 'codigo_proveedor' },
  costoUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'costo_unitario', validate: { min: 0 } },
  preferido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'productos_proveedores', underscored: true, indexes: [{ unique: true, fields: ['proveedor_id', 'producto_id'] }] });
