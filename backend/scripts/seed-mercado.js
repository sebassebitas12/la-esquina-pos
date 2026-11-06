const {
  sequelize,
  Categoria,
  Marca,
  UnidadMedida,
  Producto,
  Proveedor,
  Cliente,
  MetodoPago,
  Factura,
  DetalleFactura,
  Pago,
  Existencia,
  MovimientoInventario,
  Compra,
  DetalleCompra,
  Usuario
} = require('../models');

async function seed() {
  console.log('--- Iniciando Sembrado de Datos Realistas para La Esquina ---');
  const user = await Usuario.findOne();
  const userId = user ? user.id : 1;

  // 1. Clientes
  const [consumidorFinal] = await Cliente.findOrCreate({
    where: { nombre: 'Consumidor Final / Mostrador' },
    defaults: { correo: 'mostrador@laesquina.test', telefono: '0000-0000' }
  });
  const [cliente1] = await Cliente.findOrCreate({
    where: { nombre: 'María González' },
    defaults: { correo: 'maria.gonzalez@example.com', telefono: '8834-1122' }
  });
  const [cliente2] = await Cliente.findOrCreate({
    where: { nombre: 'Carlos Rodríguez' },
    defaults: { correo: 'carlos.rodriguez@example.com', telefono: '8712-4455' }
  });

  // 2. Métodos de Pago
  const [sinpe] = await MetodoPago.findOrCreate({
    where: { codigo: 'SINPE' },
    defaults: { nombre: 'Sinpe Móvil', activo: true }
  });
  const [efectivo] = await MetodoPago.findOrCreate({
    where: { codigo: 'EFECTIVO' },
    defaults: { nombre: 'Efectivo', activo: true }
  });
  const [tarjeta] = await MetodoPago.findOrCreate({
    where: { codigo: 'TARJETA' },
    defaults: { nombre: 'Tarjeta Débito / Crédito', activo: true }
  });

  // 3. Unidades de Medida
  const [und] = await UnidadMedida.findOrCreate({
    where: { abreviatura: 'und' },
    defaults: { nombre: 'Unidad', activa: true }
  });
  const [kg] = await UnidadMedida.findOrCreate({
    where: { abreviatura: 'kg' },
    defaults: { nombre: 'Kilogramo', activa: true }
  });
  const [litro] = await UnidadMedida.findOrCreate({
    where: { abreviatura: 'L' },
    defaults: { nombre: 'Litro', activa: true }
  });

  // 4. Categorías
  const [catBebidas] = await Categoria.findOrCreate({
    where: { nombre: 'Bebidas y Refrescos' },
    defaults: { descripcion: 'Gaseosas, jugos, agua y energizantes.', activa: true }
  });
  const [catLacteos] = await Categoria.findOrCreate({
    where: { nombre: 'Lácteos y Derivados' },
    defaults: { descripcion: 'Leches, quesos, natilla y mantequillas.', activa: true }
  });
  const [catSnacks] = await Categoria.findOrCreate({
    where: { nombre: 'Snacks y Galletas' },
    defaults: { descripcion: 'Galletas, papas, chocolates y confites.', activa: true }
  });
  const [catAbarrotes] = await Categoria.findOrCreate({
    where: { nombre: 'Granos y Abarrotes' },
    defaults: { descripcion: 'Arroz, frijoles, azúcar, pastas y aceite.', activa: true }
  });

  // 5. Marcas
  const [marcaCoca] = await Marca.findOrCreate({ where: { nombre: 'Coca-Cola' }, defaults: { activa: true } });
  const [marcaDosPinos] = await Marca.findOrCreate({ where: { nombre: 'Dos Pinos' }, defaults: { activa: true } });
  const [marcaPozuelo] = await Marca.findOrCreate({ where: { nombre: 'Pozuelo' }, defaults: { activa: true } });
  const [marcaTioPelon] = await Marca.findOrCreate({ where: { nombre: 'Tío Pelón' }, defaults: { activa: true } });

  // 6. Proveedores
  const [provFemsa] = await Proveedor.findOrCreate({
    where: { nombre: 'Coca-Cola FEMSA Costa Rica' },
    defaults: { identificacion: '3-101-123456', contacto: 'Agente de Ruta 4', correo: 'pedidos@femsa.cr', telefono: '2247-2000', direccion: 'Calle Blancos', activo: true }
  });
  const [provDosPinos] = await Proveedor.findOrCreate({
    where: { nombre: 'Cooperativa de Productores de Leche Dos Pinos' },
    defaults: { identificacion: '3-004-045123', contacto: 'Ruta Coyol', correo: 'preventa@dospinos.com', telefono: '2437-3000', direccion: 'El Coyol, Alajuela', activo: true }
  });

  // 7. Productos con Stock Realista y alertas
  const productosData = [
    {
      nombre: 'Coca-Cola Original 2L Descartable',
      sku: 'BEB-COC-2L',
      codigoBarras: '74410012001',
      precio: 1850.00,
      categoriaId: catBebidas.id,
      marcaId: marcaCoca.id,
      unidadMedidaId: und.id,
      stockActual: 24,
      stockMinimo: 10
    },
    {
      nombre: 'Coca-Cola Zero 600ml',
      sku: 'BEB-COC-600Z',
      codigoBarras: '74410012002',
      precio: 950.00,
      categoriaId: catBebidas.id,
      marcaId: marcaCoca.id,
      unidadMedidaId: und.id,
      stockActual: 15,
      stockMinimo: 8
    },
    {
      nombre: 'Leche Semidescremada Pinito 1L',
      sku: 'LAC-PIN-1L',
      codigoBarras: '74410034001',
      precio: 1100.00,
      categoriaId: catLacteos.id,
      marcaId: marcaDosPinos.id,
      unidadMedidaId: litro.id,
      stockActual: 2, // ¡STOCK CRÍTICO!
      stockMinimo: 12
    },
    {
      nombre: 'Natilla Casera Dos Pinos 400g',
      sku: 'LAC-NAT-400',
      codigoBarras: '74410034002',
      precio: 1350.00,
      categoriaId: catLacteos.id,
      marcaId: marcaDosPinos.id,
      unidadMedidaId: und.id,
      stockActual: 8,
      stockMinimo: 6
    },
    {
      nombre: 'Galletas Chiky Chocolate Paquete 6x',
      sku: 'SNK-POZ-CHK',
      codigoBarras: '74410056001',
      precio: 1250.00,
      categoriaId: catSnacks.id,
      marcaId: marcaPozuelo.id,
      unidadMedidaId: und.id,
      stockActual: 30,
      stockMinimo: 10
    },
    {
      nombre: 'Arroz Tío Pelón 99% Grano Entero 1.8kg',
      sku: 'ABR-ARR-18K',
      codigoBarras: '74410078001',
      precio: 2200.00,
      categoriaId: catAbarrotes.id,
      marcaId: marcaTioPelon.id,
      unidadMedidaId: und.id,
      stockActual: 3, // ¡STOCK CRÍTICO!
      stockMinimo: 10
    },
    {
      nombre: 'Frijoles Negros Tío Pelón 800g',
      sku: 'ABR-FRJ-800',
      codigoBarras: '74410078002',
      precio: 1450.00,
      categoriaId: catAbarrotes.id,
      marcaId: marcaTioPelon.id,
      unidadMedidaId: und.id,
      stockActual: 18,
      stockMinimo: 8
    }
  ];

  const productosCreados = [];
  for (const item of productosData) {
    const [p] = await Producto.findOrCreate({
      where: { sku: item.sku },
      defaults: {
        nombre: item.nombre,
        codigoBarras: item.codigoBarras,
        precio: item.precio,
        categoriaId: item.categoriaId,
        marcaId: item.marcaId,
        unidadMedidaId: item.unidadMedidaId,
        activo: true
      }
    });
    productosCreados.push(p);

    // Existencia
    const [ex] = await Existencia.findOrCreate({
      where: { productoId: p.id },
      defaults: {
        cantidadActual: item.stockActual,
        cantidadMinima: item.stockMinimo
      }
    });
    await ex.update({ cantidadActual: item.stockActual, cantidadMinima: item.stockMinimo });
  }

  // 8. Crear Facturas (Ventas del día) para encender métricas de ventas
  const fechaHoy = new Date().toISOString().slice(0, 10);
  
  // Venta 1: Consumidor Final
  const fact1 = await Factura.create({
    clienteId: consumidorFinal.id,
    usuarioId: userId,
    fecha: fechaHoy,
    estado: 'confirmada',
    total: 3100.00,
    saldo: 0.00
  });
  await DetalleFactura.create({ facturaId: fact1.id, productoId: productosCreados[0].id, cantidad: 1, precioUnitario: 1850.00 });
  await DetalleFactura.create({ facturaId: fact1.id, productoId: productosCreados[4].id, cantidad: 1, precioUnitario: 1250.00 });
  await Pago.create({ facturaId: fact1.id, metodoPagoId: sinpe.id, usuarioId: userId, monto: 3100.00, referencia: 'SINPE-883491', estado: 'aplicado' });

  // Venta 2: María González
  const fact2 = await Factura.create({
    clienteId: cliente1.id,
    usuarioId: userId,
    fecha: fechaHoy,
    estado: 'confirmada',
    total: 4650.00,
    saldo: 0.00
  });
  await DetalleFactura.create({ facturaId: fact2.id, productoId: productosCreados[2].id, cantidad: 2, precioUnitario: 1100.00 });
  await DetalleFactura.create({ facturaId: fact2.id, productoId: productosCreados[6].id, cantidad: 1, precioUnitario: 1450.00 });
  await DetalleFactura.create({ facturaId: fact2.id, productoId: productosCreados[3].id, cantidad: 1, precioUnitario: 1100.00 });
  await Pago.create({ facturaId: fact2.id, metodoPagoId: efectivo.id, usuarioId: userId, monto: 4650.00, referencia: 'PAGO-EFECTIVO', estado: 'aplicado' });

  // Venta 3: Carlos Rodríguez
  const fact3 = await Factura.create({
    clienteId: cliente2.id,
    usuarioId: userId,
    fecha: fechaHoy,
    estado: 'confirmada',
    total: 2200.00,
    saldo: 0.00
  });
  await DetalleFactura.create({ facturaId: fact3.id, productoId: productosCreados[5].id, cantidad: 1, precioUnitario: 2200.00 });
  await Pago.create({ facturaId: fact3.id, metodoPagoId: tarjeta.id, usuarioId: userId, monto: 2200.00, referencia: 'AUTH-VISA-9921', estado: 'aplicado' });

  console.log('¡Datos sembrados con éxito!');
  console.log('✅ Clientes: Consumidor Final, María González, Carlos Rodríguez.');
  console.log('✅ 7 Productos con marcas, categorías y códigos de barras.');
  console.log('✅ 2 Productos en alerta de stock bajo (Leche y Arroz).');
  console.log('✅ 3 Facturas confirmadas con Sinpe, Efectivo y Tarjeta (₡9,950 total).');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error al sembrar datos:', err);
  process.exit(1);
});
