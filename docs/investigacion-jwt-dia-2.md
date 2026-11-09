# Autenticación y permisos JWT — Día 2

## Objetivo

La API usa JWT para identificar a la cuenta que hace una solicitud y aplica dos roles: `administrador` y `lector`. Las rutas de autenticación de registro e inicio de sesión son públicas; las consultas de datos requieren una sesión válida. El rol determina cuáles operaciones pueden modificar información.

## Convenciones en español

El contrato HTTP usa `correo` y `contrasena`. Las rutas de autenticación también están en español:

| Método | Ruta | Acceso | Resultado |
|---|---|---|---|
| `GET` | `/api/health` | Público | Estado del servidor |
| `POST` | `/api/autenticacion/registro` | Público | Crea una cuenta con rol `lector` |
| `POST` | `/api/autenticacion/iniciar-sesion` | Público | Devuelve el token y los datos seguros |
| `GET` | `/api/autenticacion/sesion` | Privado | Devuelve la cuenta asociada al token |

Ejemplo de JSON para registro:

```json
{
  "nombre": "Ana Ejemplo",
  "correo": "ana@example.test",
  "contrasena": "UnaClaveSegura123"
}
```

El inicio de sesión recibe `correo` y `contrasena`. El backend rechaza campos desconocidos; por eso una solicitud que use `password` o intente enviar `rol` no es válida. El hash de contraseña se guarda en `contrasena_hash`, nunca se devuelve en las respuestas ni se incluye en el token.

## Rutas privadas de negocio

Las siguientes rutas requieren `Authorization: Bearer <token>`:

`/api/clientes`, `/api/categorias`, `/api/marcas`, `/api/unidades-medida`, `/api/productos`, `/api/proveedores`, `/api/productos-proveedores`, `/api/compras`, `/api/detalles-compra`, `/api/facturas`, `/api/detalles-factura`, `/api/metodos-pago`, `/api/pagos`, `/api/existencias`, `/api/movimientos-inventario`, `/api/devoluciones` y `/api/detalles-devolucion`.

La regla se aplica a las rutas de lista, detalle, CRUD y acciones de cada recurso. Sin token, o con un token inválido o vencido, el servidor responde `401`.

## Permisos por rol

| Operación | Administrador | Lector |
|---|---:|---:|
| Consultar listas y detalles (`GET`, `HEAD`) | Sí | Sí |
| Crear, actualizar o eliminar (`POST`, `PUT`, `PATCH`, `DELETE`) | Sí | No, responde `403` |
| Usar `POST /api/ai/consulta` | Sí | Sí |

El asistente requiere autenticación y consulta información; no crea ni modifica registros. Las solicitudes `OPTIONS` son comprobaciones previas de CORS y no son operaciones de datos.

El registro asigna siempre `lector`; no existe una cuenta administradora con una contraseña conocida ni se puede pedir el rol enviándolo desde el formulario. Para promover una cuenta después de registrarla, una persona con acceso al entorno local ejecuta desde `backend`:

```powershell
npm.cmd run usuario:asignar-rol -- --correo=tu-correo@ejemplo.com --rol=administrador
```

Para devolverla al rol de consulta, se usa `--rol=lector`. El script solo acepta esos dos roles y modifica la cuenta encontrada por correo.

## Qué contiene y cómo se valida el JWT

Un JSON Web Token es una representación compacta de *claims* firmados. La codificación no cifra el contenido: quien tenga el token puede leer sus claims. El proyecto incluye solo el id de la cuenta en `sub`, firma con `HS256` y vence en una hora. No coloca la contraseña, su hash ni el rol en el payload.

En cada solicitud privada, el middleware verifica firma y expiración y consulta en MySQL la cuenta y su rol vigente. Así, cambiar el rol en la base tiene efecto de inmediato y no depende del rol que hubiera al iniciar sesión.

La contraseña se almacena como hash de bcrypt. El frontend guarda el token y el usuario en `localStorage` bajo la clave `esquina_session` para conservar la sesión al recargar la página; ante un `401`, limpia la sesión y vuelve al inicio. Este almacenamiento es legible por JavaScript del mismo origen, por lo que en un sistema publicado requeriría una evaluación adicional de seguridad. El proyecto es un ejercicio local y no configura cookies de producción ni renovación de tokens.

## Fuentes consultadas

- IETF, [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html), formato y claims registrados, incluido `exp`.
- IETF, [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html), validación del algoritmo y prácticas para tokens firmados.
- Auth0, [node-jsonwebtoken README](https://github.com/auth0/node-jsonwebtoken/blob/master/README.md), opciones `expiresIn`, `jwt.sign` y `jwt.verify`.
- Proyecto `bcrypt`, [README de bcrypt para Node.js](https://github.com/kelektiv/node.bcrypt.js/blob/master/README.md), creación de hashes y comparación de contraseñas.
- OWASP, [JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html) y [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), riesgos del token y almacenamiento web.

Consulta de fuentes: 9 de noviembre de 2026.
