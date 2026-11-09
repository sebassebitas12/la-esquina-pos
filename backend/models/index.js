const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const Cliente = require('./cliente')(sequelize, DataTypes);
const Producto = require('./producto')(sequelize, DataTypes);
const Factura = require('./factura')(sequelize, DataTypes);
const DetalleFactura = require('./detalle-factura')(sequelize, DataTypes);
const Usuario = require('./usuario')(sequelize, DataTypes);
const Rol = require('./rol')(sequelize, DataTypes);
const Categoria = require('./categoria')(sequelize, DataTypes);
const Marca = require('./marca')(sequelize, DataTypes);
const UnidadMedida = require('./unidad-medida')(sequelize, DataTypes);
const Proveedor = require('./proveedor')(sequelize, DataTypes);
const ProductoProveedor = require('./producto-proveedor')(sequelize, DataTypes);
const Compra = require('./compra')(sequelize, DataTypes);
const DetalleCompra = require('./detalle-compra')(sequelize, DataTypes);
const MetodoPago = require('./metodo-pago')(sequelize, DataTypes);
const Pago = require('./pago')(sequelize, DataTypes);
const Existencia = require('./existencia')(sequelize, DataTypes);
const MovimientoInventario = require('./movimiento-inventario')(sequelize, DataTypes);
const Devolucion = require('./devolucion')(sequelize, DataTypes);
const DetalleDevolucion = require('./detalle-devolucion')(sequelize, DataTypes);

Categoria.hasMany(Producto, { foreignKey: 'categoriaId', as: 'productos' });
Producto.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });
Rol.hasMany(Usuario, { foreignKey: 'rolId', as: 'usuarios' });
Usuario.belongsTo(Rol, { foreignKey: 'rolId', as: 'rol' });
Marca.hasMany(Producto, { foreignKey: 'marcaId', as: 'productos' });
Producto.belongsTo(Marca, { foreignKey: 'marcaId', as: 'marca' });
UnidadMedida.hasMany(Producto, { foreignKey: 'unidadMedidaId', as: 'productos' });
Producto.belongsTo(UnidadMedida, { foreignKey: 'unidadMedidaId', as: 'unidadMedida' });

Proveedor.hasMany(Compra, { foreignKey: 'proveedorId', as: 'compras' });
Compra.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
Proveedor.hasMany(ProductoProveedor, { foreignKey: 'proveedorId', as: 'productosRelacionados' });
ProductoProveedor.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
Producto.hasMany(ProductoProveedor, { foreignKey: 'productoId', as: 'proveedoresRelacionados' });
ProductoProveedor.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });
Proveedor.belongsToMany(Producto, { through: ProductoProveedor, foreignKey: 'proveedorId', otherKey: 'productoId', as: 'productos' });
Producto.belongsToMany(Proveedor, { through: ProductoProveedor, foreignKey: 'productoId', otherKey: 'proveedorId', as: 'proveedores' });

Compra.hasMany(DetalleCompra, { foreignKey: 'compraId', as: 'detalles', onDelete: 'CASCADE' });
DetalleCompra.belongsTo(Compra, { foreignKey: 'compraId', as: 'compra' });
Producto.hasMany(DetalleCompra, { foreignKey: 'productoId', as: 'compras' });
DetalleCompra.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });

Cliente.hasMany(Factura, { foreignKey: 'clienteId', as: 'facturas', onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
Factura.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente', onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
Usuario.hasMany(Factura, { foreignKey: 'usuarioId', as: 'facturas' });
Factura.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Factura.hasMany(DetalleFactura, { foreignKey: 'facturaId', as: 'detalles', onDelete: 'CASCADE' });
DetalleFactura.belongsTo(Factura, { foreignKey: 'facturaId', as: 'factura' });
Producto.hasMany(DetalleFactura, { foreignKey: 'productoId', as: 'ventas' });
DetalleFactura.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });

Usuario.hasMany(Compra, { foreignKey: 'usuarioId', as: 'compras' });
Compra.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
MetodoPago.hasMany(Pago, { foreignKey: 'metodoPagoId', as: 'pagos' });
Pago.belongsTo(MetodoPago, { foreignKey: 'metodoPagoId', as: 'metodoPago' });
Factura.hasMany(Pago, { foreignKey: 'facturaId', as: 'pagos' });
Pago.belongsTo(Factura, { foreignKey: 'facturaId', as: 'factura' });
Usuario.hasMany(Pago, { foreignKey: 'usuarioId', as: 'pagos' });
Pago.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

Producto.hasOne(Existencia, { foreignKey: 'productoId', as: 'existencia', onDelete: 'CASCADE' });
Existencia.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });
Producto.hasMany(MovimientoInventario, { foreignKey: 'productoId', as: 'movimientos' });
MovimientoInventario.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });
Usuario.hasMany(MovimientoInventario, { foreignKey: 'usuarioId', as: 'movimientosInventario' });
MovimientoInventario.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Compra.hasMany(MovimientoInventario, { foreignKey: 'compraId', as: 'movimientosInventario' });
MovimientoInventario.belongsTo(Compra, { foreignKey: 'compraId', as: 'compra' });
Factura.hasMany(MovimientoInventario, { foreignKey: 'facturaId', as: 'movimientosInventario' });
MovimientoInventario.belongsTo(Factura, { foreignKey: 'facturaId', as: 'factura' });

Factura.hasMany(Devolucion, { foreignKey: 'facturaId', as: 'devoluciones' });
Devolucion.belongsTo(Factura, { foreignKey: 'facturaId', as: 'factura' });
Usuario.hasMany(Devolucion, { foreignKey: 'usuarioId', as: 'devoluciones' });
Devolucion.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Devolucion.hasMany(DetalleDevolucion, { foreignKey: 'devolucionId', as: 'detalles', onDelete: 'CASCADE' });
DetalleDevolucion.belongsTo(Devolucion, { foreignKey: 'devolucionId', as: 'devolucion' });
DetalleFactura.hasMany(DetalleDevolucion, { foreignKey: 'detalleFacturaId', as: 'devoluciones' });
DetalleDevolucion.belongsTo(DetalleFactura, { foreignKey: 'detalleFacturaId', as: 'detalleFactura' });
Devolucion.hasMany(MovimientoInventario, { foreignKey: 'devolucionId', as: 'movimientosInventario' });
MovimientoInventario.belongsTo(Devolucion, { foreignKey: 'devolucionId', as: 'devolucion' });

module.exports = {
  sequelize,
  Cliente,
  Producto,
  Factura,
  DetalleFactura,
  Usuario,
  Rol,
  Categoria,
  Marca,
  UnidadMedida,
  Proveedor,
  ProductoProveedor,
  Compra,
  DetalleCompra,
  MetodoPago,
  Pago,
  Existencia,
  MovimientoInventario,
  Devolucion,
  DetalleDevolucion
};
