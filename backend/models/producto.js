module.exports = (sequelize, DataTypes) => sequelize.define('Producto', {
  nombre: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true, len: [1, 150] } },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
  sku: { type: DataTypes.STRING(40), allowNull: true, unique: true },
  codigoBarras: { type: DataTypes.STRING(32), allowNull: true, unique: true, field: 'codigo_barras' },
  categoriaId: { type: DataTypes.INTEGER, allowNull: true, field: 'categoria_id' },
  marcaId: { type: DataTypes.INTEGER, allowNull: true, field: 'marca_id' },
  unidadMedidaId: { type: DataTypes.INTEGER, allowNull: true, field: 'unidad_medida_id' },
  descripcion: { type: DataTypes.STRING(255), allowNull: true },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'productos', underscored: true });
