'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const stamp = {
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    };
    await queryInterface.createTable('categorias', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...stamp
    });

    await queryInterface.createTable('marcas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...stamp
    });

    await queryInterface.createTable('unidades_medida', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      abreviatura: { type: Sequelize.STRING(12), allowNull: false, unique: true },
      activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...stamp
    });

    await queryInterface.createTable('proveedores', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: Sequelize.STRING(150), allowNull: false },
      identificacion: { type: Sequelize.STRING(30), allowNull: true, unique: true },
      contacto: { type: Sequelize.STRING(150), allowNull: true },
      correo: { type: Sequelize.STRING(254), allowNull: true },
      telefono: { type: Sequelize.STRING(30), allowNull: true },
      direccion: { type: Sequelize.STRING(255), allowNull: true },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...stamp
    });
    await queryInterface.addIndex('proveedores', ['nombre'], { name: 'proveedores_nombre_idx' });

    await queryInterface.createTable('metodos_pago', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...stamp
    });

    await queryInterface.addColumn('productos', 'sku', { type: Sequelize.STRING(40), allowNull: true });
    await queryInterface.addColumn('productos', 'codigo_barras', { type: Sequelize.STRING(32), allowNull: true });
    await queryInterface.addColumn('productos', 'categoria_id', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('productos', 'marca_id', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('productos', 'unidad_medida_id', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('productos', 'descripcion', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn('productos', 'activo', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    await queryInterface.addIndex('productos', ['sku'], { unique: true, name: 'productos_sku_unique' });
    await queryInterface.addIndex('productos', ['codigo_barras'], { unique: true, name: 'productos_codigo_barras_unique' });
    await queryInterface.addConstraint('productos', {
      fields: ['categoria_id'], type: 'foreign key', name: 'fk_productos_categorias', references: { table: 'categorias', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
    });
    await queryInterface.addConstraint('productos', {
      fields: ['marca_id'], type: 'foreign key', name: 'fk_productos_marcas', references: { table: 'marcas', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL'
    });
    await queryInterface.addConstraint('productos', {
      fields: ['unidad_medida_id'], type: 'foreign key', name: 'fk_productos_unidades_medida', references: { table: 'unidades_medida', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
    });

    await queryInterface.createTable('productos_proveedores', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      proveedor_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'proveedores', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      producto_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      codigo_proveedor: { type: Sequelize.STRING(80), allowNull: true },
      costo_unitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      preferido: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...stamp
    });
    await queryInterface.addIndex('productos_proveedores', ['proveedor_id', 'producto_id'], { unique: true, name: 'productos_proveedores_par_unique' });
    await queryInterface.sequelize.query('ALTER TABLE `productos_proveedores` ADD CONSTRAINT `chk_productos_proveedores_costo_no_negativo` CHECK (`costo_unitario` >= 0)');

    await queryInterface.createTable('compras', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      proveedor_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'proveedores', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_recepcion: { type: Sequelize.DATE, allowNull: true },
      estado: { type: Sequelize.ENUM('borrador', 'recibida', 'anulada'), allowNull: false, defaultValue: 'borrador' },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      ...stamp
    });
    await queryInterface.addIndex('compras', ['proveedor_id', 'fecha'], { name: 'compras_proveedor_fecha_idx' });

    await queryInterface.createTable('detalles_compra', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      compra_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'compras', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      producto_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      cantidad: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      costo_unitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      ...stamp
    });
    await queryInterface.addIndex('detalles_compra', ['compra_id', 'producto_id'], { unique: true, name: 'detalles_compra_producto_unique' });

    await queryInterface.addColumn('facturas', 'usuario_id', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('facturas', 'fecha_confirmacion', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('facturas', 'estado', { type: Sequelize.ENUM('borrador', 'confirmada', 'anulada'), allowNull: false, defaultValue: 'borrador' });
    await queryInterface.addConstraint('facturas', {
      fields: ['usuario_id'], type: 'foreign key', name: 'fk_facturas_usuarios', references: { table: 'usuarios', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('facturas', ['estado', 'fecha'], { name: 'facturas_estado_fecha_idx' });

    await queryInterface.createTable('pagos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      factura_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'facturas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      metodo_pago_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'metodos_pago', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      monto: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      fecha: { type: Sequelize.DATE, allowNull: false },
      referencia: { type: Sequelize.STRING(100), allowNull: true },
      estado: { type: Sequelize.ENUM('aplicado', 'anulado'), allowNull: false, defaultValue: 'aplicado' },
      ...stamp
    });
    await queryInterface.addIndex('pagos', ['factura_id', 'fecha'], { name: 'pagos_factura_fecha_idx' });

    await queryInterface.createTable('devoluciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      factura_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'facturas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      fecha: { type: Sequelize.DATE, allowNull: false },
      motivo: { type: Sequelize.STRING(255), allowNull: false },
      estado: { type: Sequelize.ENUM('borrador', 'procesada'), allowNull: false, defaultValue: 'borrador' },
      ...stamp
    });
    await queryInterface.addIndex('devoluciones', ['factura_id', 'estado'], { name: 'devoluciones_factura_estado_idx' });

    await queryInterface.createTable('detalles_devolucion', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      devolucion_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'devoluciones', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      detalle_factura_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'detalle_factura', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      cantidad: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      precio_unitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      ...stamp
    });
    await queryInterface.addIndex('detalles_devolucion', ['devolucion_id', 'detalle_factura_id'], { unique: true, name: 'detalles_devolucion_linea_unique' });

    await queryInterface.createTable('existencias', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      producto_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      cantidad_actual: { type: Sequelize.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
      cantidad_minima: { type: Sequelize.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
      ...stamp
    });
    await queryInterface.sequelize.query('INSERT INTO `existencias` (`producto_id`, `cantidad_actual`, `cantidad_minima`, `created_at`, `updated_at`) SELECT `id`, 0, 0, NOW(), NOW() FROM `productos`');

    await queryInterface.createTable('movimientos_inventario', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      producto_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      compra_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'compras', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      factura_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'facturas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      devolucion_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'devoluciones', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      tipo: { type: Sequelize.ENUM('entrada', 'salida', 'ajuste', 'devolucion'), allowNull: false },
      cantidad: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      nota: { type: Sequelize.STRING(255), allowNull: true },
      ...stamp
    });
    await queryInterface.addIndex('movimientos_inventario', ['producto_id', 'created_at'], { name: 'movimientos_producto_fecha_idx' });
    await queryInterface.sequelize.query(
      'ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `chk_movimientos_cantidad_no_cero` CHECK (`cantidad` <> 0)'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movimientos_inventario');
    await queryInterface.dropTable('existencias');
    await queryInterface.dropTable('detalles_devolucion');
    await queryInterface.dropTable('devoluciones');
    await queryInterface.dropTable('pagos');
    await queryInterface.dropTable('detalles_compra');
    await queryInterface.dropTable('compras');
    await queryInterface.dropTable('productos_proveedores');
    await queryInterface.removeIndex('facturas', 'facturas_estado_fecha_idx');
    await queryInterface.removeConstraint('facturas', 'fk_facturas_usuarios');
    await queryInterface.removeColumn('facturas', 'estado');
    await queryInterface.removeColumn('facturas', 'fecha_confirmacion');
    await queryInterface.removeColumn('facturas', 'usuario_id');
    await queryInterface.removeConstraint('productos', 'fk_productos_unidades_medida');
    await queryInterface.removeConstraint('productos', 'fk_productos_marcas');
    await queryInterface.removeConstraint('productos', 'fk_productos_categorias');
    await queryInterface.removeIndex('productos', 'productos_codigo_barras_unique');
    await queryInterface.removeIndex('productos', 'productos_sku_unique');
    await queryInterface.removeColumn('productos', 'activo');
    await queryInterface.removeColumn('productos', 'descripcion');
    await queryInterface.removeColumn('productos', 'unidad_medida_id');
    await queryInterface.removeColumn('productos', 'marca_id');
    await queryInterface.removeColumn('productos', 'categoria_id');
    await queryInterface.removeColumn('productos', 'codigo_barras');
    await queryInterface.removeColumn('productos', 'sku');
    await queryInterface.dropTable('metodos_pago');
    await queryInterface.dropTable('proveedores');
    await queryInterface.dropTable('unidades_medida');
    await queryInterface.dropTable('marcas');
    await queryInterface.dropTable('categorias');
  }
};
