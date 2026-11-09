# Modelo de negocio del backend

El escenario representa un minimercado con un solo local. La API identifica a la persona autenticada que registra las operaciones. El alcance suma 19 tablas relacionadas, incluidas las tablas `usuarios` y `roles`; el registro crea cuentas con rol lector. No se precargan cuentas de administración ni registros de negocio.

## Entidades y propósito

| Tabla | Datos principales | Uso |
|---|---|---|
| `usuarios` | nombre, correo, hash de contraseña | Registro e inicio de sesión; responsable de operaciones. |
| `roles` | nombre, descripción | Roles `administrador` y `lector`; un rol se puede asignar a muchos usuarios. |
| `clientes` | nombre, correo, teléfono | Personas a quienes se les emiten facturas. |
| `categorias` | nombre, descripción, estado | Clasificación de productos. |
| `marcas` | nombre, descripción, estado | Marca comercial opcional del producto. |
| `unidades_medida` | nombre, abreviatura, estado | Unidad usada para vender y contar un producto. |
| `productos` | nombre, SKU, código de barras, precio, clasificación, descripción, estado | Catálogo de artículos. SKU y código de barras pueden ser nulos; si se proporcionan, deben ser únicos. |
| `proveedores` | nombre, identificación, contacto y datos de comunicación | Empresas que suministran productos y compras. |
| `productos_proveedores` | producto, proveedor, código del proveedor, costo y preferencia | Asociación N:M y datos de compra de cada pareja. La pareja producto-proveedor es única. |
| `compras` | proveedor, usuario, fecha, estado y observaciones | Documento de abastecimiento en borrador, recibido o anulado. |
| `detalles_compra` | compra, producto, cantidad y costo unitario | Líneas de productos solicitados en una compra. |
| `facturas` | cliente, usuario, fecha, estado y confirmación | Venta en borrador, confirmada o anulada. |
| `detalle_factura` | factura, producto, cantidad y precio unitario | Líneas de venta; conserva el precio aplicado en esa factura. |
| `metodos_pago` | código, nombre y estado | Catálogo de formas de cobro. |
| `pagos` | factura, método, usuario, monto, fecha, referencia y estado | Pagos parciales o completos asociados a una factura. |
| `existencias` | producto, cantidad actual y cantidad mínima | Saldo actual y umbral de reposición; una fila por producto. |
| `movimientos_inventario` | producto, usuario, tipo, cantidad y documento relacionado | Historial de entradas, salidas y ajustes que explican el saldo. |
| `devoluciones` | factura, usuario, fecha, motivo y estado | Devolución en borrador o procesada asociada a una venta. |
| `detalles_devolucion` | devolución, detalle vendido, cantidad y precio | Líneas devueltas; apuntan a la línea original de la factura. |

`createdAt` y `updatedAt` son campos de Sequelize para auditoría temporal. El DER visual contiene el resumen de claves y tipos de datos.

## Relaciones

| Relación | Cardinalidad | Motivo |
|---|---|---|
| Categoría → producto | 1:N | Una categoría agrupa productos. |
| Marca → producto | 1:N opcional | Una marca puede clasificar productos; el producto puede no tener marca. |
| Unidad de medida → producto | 1:N | Una unidad puede usarse en varios productos. |
| Producto ↔ proveedor | N:M por `productos_proveedores` | Conserva costo y código por proveedor. |
| Proveedor → compra | 1:N | Cada compra se hace a un proveedor. |
| Compra → detalle de compra | 1:N | La compra agrupa líneas. |
| Producto → detalle de compra | 1:N | Un producto puede aparecer en muchas compras. |
| Cliente → factura | 1:N | Cada factura pertenece a un cliente. |
| Factura → detalle de factura | 1:N | La factura agrupa líneas de venta. |
| Producto → detalle de factura | 1:N | El artículo puede aparecer en muchas ventas. |
| Factura → pago | 1:N | Una venta puede pagarse en varios abonos. |
| Método de pago → pago | 1:N | Un método se puede usar en muchos cobros. |
| Producto ↔ existencia | 1:1 | Un registro guarda el saldo actual por producto. |
| Producto → movimiento de inventario | 1:N | El producto acumula un historial de movimientos. |
| Factura → devolución | 1:N | Una venta puede generar devoluciones. |
| Devolución → detalle de devolución | 1:N | La devolución agrupa las líneas que vuelven. |
| Detalle de factura → detalle de devolución | 1:N | Una línea vendida puede devolverse en partes. |
| Usuario → operación | 1:N | Registra quién creó compras, ventas, cobros, movimientos y devoluciones. |

## Flujo operativo

1. Se crean categorías, marcas, unidades, proveedores y métodos de pago. No hay datos de ejemplo automáticos.
2. Se registra un producto. Al guardarlo, una transacción crea su fila de existencias con saldo cero.
3. Se asignan proveedores al producto y se prepara una compra con sus líneas.
4. `POST /api/compras/:id/recibir` recibe un borrador. Una transacción cambia el estado, suma las cantidades y agrega movimientos de entrada. No se puede recibir dos veces.
5. Se crea una factura en borrador y se agregan sus líneas. `POST /api/facturas/:id/confirmar` bloquea y verifica las existencias; si hay stock, confirma la factura, descuenta todas sus líneas y registra salidas en la misma transacción. Si falta stock, la operación completa se revierte.
6. Se agregan pagos sin exceder el total pendiente de la factura.
7. Se prepara una devolución vinculada a la factura y a sus líneas originales. `POST /api/devoluciones/:id/procesar` comprueba cuánto queda por devolver, suma el inventario y crea movimientos de entrada en una sola transacción.

## Reglas de integridad y alcance del CRUD

- Las claves foráneas impiden guardar líneas, movimientos o pagos sin sus registros relacionados.
- El backend valida los tipos, campos requeridos, precios, montos y cantidades; la base también aplica claves únicas, claves foráneas, `NOT NULL` y restricciones de cantidad compatibles con MySQL.
- Cantidades y montos usan `DECIMAL` para admitir fracciones de producto y mantener precisión monetaria.
- Compras, facturas y devoluciones solo permiten cambios en borrador. Documentos recibidos o procesados no se borran como si nunca hubieran ocurrido; las facturas solo se anulan bajo las reglas del controlador.
- `existencias` se consulta y se permite ajustar su mínimo; el saldo no se cambia directamente por CRUD. Se actualiza mediante recepción, venta, devolución o un movimiento manual.
- `movimientos_inventario` es un historial inmutable por API. `PUT`, `PATCH` y `DELETE` responden conflicto; para corregir un dato operativo se registra un nuevo ajuste.
- `usuarios` se gestiona mediante registro, login y consulta de sesión, no mediante un CRUD genérico que permita exponer o reemplazar hashes de contraseñas.
- `roles` no tiene un CRUD público. El registro asigna `lector`; la promoción a administrador se ejecuta localmente con el comando descrito en [investigacion-jwt-dia-2.md](investigacion-jwt-dia-2.md).
- `productos_proveedores` tiene CRUD, aunque sus relaciones se protegen contra duplicación y referencias inexistentes.

Las restricciones de borrado dependen de las asociaciones. Un registro de catálogo no se elimina si dejaría referencias rotas. Los errores de validación responden `400`, las referencias inexistentes `404` y los conflictos de estado o relación `409`.
