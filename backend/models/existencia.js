module.exports = (sequelize, DataTypes) => sequelize.define('Existencia', {
  productoId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'producto_id' },
  cantidadActual: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0, field: 'cantidad_actual', validate: { min: 0 } },
  cantidadMinima: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0, field: 'cantidad_minima', validate: { min: 0 } }
}, { tableName: 'existencias', underscored: true });
