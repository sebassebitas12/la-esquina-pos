const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { Op } = require('sequelize');
const { sequelize, Usuario, Cliente, Categoria, Marca, UnidadMedida, Proveedor, Producto, MetodoPago, ProductoProveedor, Compra, Factura, Pago, Devolucion, DetalleDevolucion, DetalleFactura, DetalleCompra, MovimientoInventario, Existencia } = require('../models');

async function removeFixture(runId) {
  const sku = `SMKDOM-${runId.toUpperCase()}`;
  const userEmail = `smkdom-user.${runId}@example.test`;
  const clientEmail = `smkdom.${runId}@example.test`;
  const categoryName = `SMKDOM categoria ${runId}`;
  const brandName = `SMKDOM marca ${runId}`;
  const unitName = `SMKDOM unidad ${runId}`;
  const supplierName = `SMKDOM proveedor ${runId}`;
  const paymentCode = `smkdom-${runId}`;

  await sequelize.transaction(async (transaction) => {
    const [user, client, supplier, product] = await Promise.all([
      Usuario.findOne({ where: { correo: userEmail }, transaction }),
      Cliente.findOne({ where: { correo: clientEmail }, transaction }),
      Proveedor.findOne({ where: { nombre: supplierName }, transaction }),
      Producto.findOne({ where: { sku }, transaction })
    ]);
    const invoiceWhere = {};
    if (user) invoiceWhere.usuarioId = user.id;
    if (client) invoiceWhere.clienteId = client.id;
    const invoices = Object.keys(invoiceWhere).length ? await Factura.findAll({ where: invoiceWhere, attributes: ['id'], transaction }) : [];
    const invoiceIds = invoices.map((invoice) => invoice.id);
    const purchaseWhere = { observaciones: runId };
    if (user) purchaseWhere.usuarioId = user.id;
    if (supplier) purchaseWhere.proveedorId = supplier.id;
    const purchases = user && supplier ? await Compra.findAll({ where: purchaseWhere, attributes: ['id'], transaction }) : [];
    const purchaseIds = purchases.map((purchase) => purchase.id);
    const returns = invoiceIds.length ? await Devolucion.findAll({ where: { facturaId: { [Op.in]: invoiceIds } }, attributes: ['id'], transaction }) : [];
    const returnIds = returns.map((record) => record.id);

    if (product) await MovimientoInventario.destroy({ where: { productoId: product.id }, transaction });
    if (returnIds.length) {
      await DetalleDevolucion.destroy({ where: { devolucionId: { [Op.in]: returnIds } }, transaction });
      await Devolucion.destroy({ where: { id: { [Op.in]: returnIds } }, transaction });
    }
    if (invoiceIds.length) {
      await Pago.destroy({ where: { facturaId: { [Op.in]: invoiceIds } }, transaction });
      await DetalleFactura.destroy({ where: { facturaId: { [Op.in]: invoiceIds } }, transaction });
      await Factura.destroy({ where: { id: { [Op.in]: invoiceIds } }, transaction });
    }
    if (purchaseIds.length) {
      await DetalleCompra.destroy({ where: { compraId: { [Op.in]: purchaseIds } }, transaction });
      await Compra.destroy({ where: { id: { [Op.in]: purchaseIds } }, transaction });
    }
    if (product) {
      await ProductoProveedor.destroy({ where: { productoId: product.id }, transaction });
      await Existencia.destroy({ where: { productoId: product.id }, transaction });
      await Producto.destroy({ where: { id: product.id }, transaction });
    }

    if (supplier) await Proveedor.destroy({ where: { id: supplier.id }, transaction });
    await MetodoPago.destroy({ where: { codigo: paymentCode }, transaction });
    await Categoria.destroy({ where: { nombre: categoryName }, transaction });
    await Marca.destroy({ where: { nombre: brandName }, transaction });
    await UnidadMedida.destroy({ where: { nombre: unitName }, transaction });
    if (client) await Cliente.destroy({ where: { id: client.id }, transaction });
    if (user) await Usuario.destroy({ where: { id: user.id }, transaction });
  });
}

const runId = process.argv[2];
if (!runId || !/^[a-f0-9]{10}$/.test(runId)) {
  console.error('A 10-character hexadecimal smoke run id is required.');
  process.exitCode = 2;
  sequelize.close();
} else {
  removeFixture(runId)
    .then(() => console.log(`Domain smoke fixture ${runId} removed.`))
    .catch((error) => {
      console.error(`Could not clean domain smoke fixture ${runId}: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}
