# Justificación del proyecto

## Escenario empresarial

**Minimercado La Esquina** es un negocio ficticio empleado como escenario académico simulado. Para operar, necesita identificar a sus clientes, mantener un catálogo de artículos y proveedores, registrar compras, controlar existencias, emitir ventas, cobrar y procesar devoluciones. El sistema propuesto conserva la relación entre estas operaciones para que cada cambio de inventario tenga una causa y un responsable identificables.

## Modelo de datos

El diseño está compuesto por 19 tablas: `usuarios`, `roles`, `clientes`, `categorias`, `marcas`, `unidades_medida`, `productos`, `proveedores`, `productos_proveedores`, `compras`, `detalles_compra`, `facturas`, `detalle_factura`, `metodos_pago`, `pagos`, `existencias`, `movimientos_inventario`, `devoluciones` y `detalles_devolucion`.

Las relaciones principales responden a necesidades del negocio:

- Una categoría, marca o unidad puede clasificar muchos productos.
- Un producto puede ser ofrecido por varios proveedores y un proveedor puede abastecer varios productos; `productos_proveedores` guarda datos particulares de esa relación.
- Un proveedor registra muchas compras; cada compra tiene líneas asociadas a productos.
- Un cliente puede recibir muchas facturas. Una factura tiene detalles de venta, y cada detalle conserva cantidad y precio aplicado.
- Una factura puede recibir pagos parciales por diferentes métodos.
- Cada producto tiene una fila de existencia actual y un historial de movimientos.
- Una devolución referencia una factura y sus líneas apuntan a los detalles de venta originales.
- Un rol agrupa usuarios con el mismo nivel de acceso; cada usuario tiene un rol y un rol puede asignarse a muchos usuarios.
- El usuario autenticado queda asociado como responsable de operaciones de compra, cobro, inventario y devolución.

El diagrama entidad-relación visual muestra las claves primarias y foráneas junto con las cardinalidades. El detalle de campos y restricciones está en [modelo-negocio-backend.md](modelo-negocio-backend.md).

## Funcionamiento del negocio

Primero se crean los datos de catálogo y productos. Luego se registran proveedores, se arma una compra y se reciben sus líneas. La recepción incrementa el inventario. Para vender, se crea una factura en borrador con sus detalles y se confirma cuando hay existencias suficientes; la confirmación descuenta el stock. A esa factura se le pueden asociar pagos. Si se devuelve un producto, la devolución identifica el detalle vendido y, al procesarse, reintegra las unidades.

Las operaciones que cambian varias filas de inventario se ejecutan dentro de transacciones para evitar que una compra, venta o devolución quede aplicada a medias. Los movimientos procesados son historial y no se editan ni borran: una corrección se registra como un nuevo ajuste.

## Alcance académico

El proyecto aplica claves primarias y foráneas, restricciones, relaciones 1:N, 1:1 y N:M, consultas con asociaciones de Sequelize, validación en Express, autenticación JWT, roles, permisos por método HTTP, operaciones CRUD y migraciones versionadas. No incluye datos de demostración precargados ni multi-sucursal.
