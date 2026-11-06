module.exports = (sequelize, DataTypes) => sequelize.define('MovimientoInventario', {
  productoId: { type: DataTypes.INTEGER, allowNull: false, field: 'producto_id' },
  usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: 'usuario_id' },
  compraId: { type: DataTypes.INTEGER, allowNull: true, field: 'compra_id' },
  facturaId: { type: DataTypes.INTEGER, allowNull: true, field: 'factura_id' },
  devolucionId: { type: DataTypes.INTEGER, allowNull: true, field: 'devolucion_id' },
  tipo: { type: DataTypes.ENUM('entrada', 'salida', 'ajuste', 'devolucion'), allowNull: false },
  cantidad: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  nota: { type: DataTypes.STRING(255), allowNull: true }
}, { tableName: 'movimientos_inventario', underscored: true });
