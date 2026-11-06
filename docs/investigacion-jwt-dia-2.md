# Investigación de autenticación para el Día 2

## Objetivo

La API del Minimercado La Esquina usará JWT para identificar a usuarios registrados y limitar las rutas de clientes, productos, facturas y detalles de factura. El registro, el inicio de sesión y la consulta de identidad serán públicos solo donde lo indica la consigna; las rutas de negocio requerirán autenticación. No se implementarán roles ni permisos diferenciados.

## Qué representa un JWT

Un JSON Web Token es una representación compacta de *claims* que una parte puede firmar para que otra verifique su integridad y origen. La codificación de sus partes no cifra el contenido: quien obtiene un token puede leer sus claims. Por eso el proyecto no pondrá contraseñas, hashes ni información sensible dentro del payload. La API identificará al usuario mediante su id (`sub`) y aceptará el token solo mientras su firma y expiración sean válidas.

## Decisiones para este proyecto

- **Contraseñas:** guardar únicamente un hash generado con bcrypt y comparar la contraseña ingresada contra ese hash al iniciar sesión. El mínimo de ocho caracteres se valida antes de crear el hash.
- **Firma y verificación:** usar `jsonwebtoken` en Node.js, fijar explícitamente `HS256` tanto al firmar como al verificar, y guardar la clave en `JWT_SECRET` dentro del `.env`, que no se sube al repositorio. La verificación rechazará tokens con firma inválida o vencidos.
- **Vencimiento:** emitir tokens con duración de una hora (`exp`). No se agrega renovación de tokens porque la consigna no pide un endpoint de renovación; al vencer, la aplicación pedirá iniciar sesión de nuevo.
- **Envío:** el frontend conservará el token en memoria mediante el contexto de React y lo enviará como `Authorization: Bearer <token>`. Si se recarga la página, se pierde la sesión y se inicia sesión otra vez.
- **Almacenamiento:** no guardar el token en `localStorage` ni `sessionStorage`: cualquier JavaScript ejecutado en el mismo origen puede leer esos valores. El contexto en memoria cumple el flujo de Bearer requerido y evita la persistencia, aunque un XSS activo todavía podría acceder al token durante la sesión. La guía de OWASP prefiere cookies `HttpOnly`, `Secure` y `SameSite` para sesiones web; adoptar esa alternativa cambiaría el mecanismo exigido por esta práctica y requeriría tratar CSRF.
- **Errores de autenticación:** credenciales incorrectas, token ausente, inválido o vencido producen `401`. Al recibir `401`, React borra la sesión y vuelve al inicio de sesión.
- **Transporte:** en una publicación real, toda comunicación debe ir por HTTPS. El uso local de `http://localhost` corresponde al entorno académico de desarrollo.

## Flujo

1. `POST /api/auth/register` valida nombre, correo y contraseña; normaliza el correo, comprueba que no exista y guarda solo el hash. Responde `201` con datos seguros del usuario, nunca con el hash.
2. `POST /api/auth/login` busca el correo y compara la contraseña con bcrypt. Si coincide, responde `200` con el JWT y los datos seguros del usuario; si no, responde `401`.
3. El middleware lee `Authorization: Bearer <token>`, verifica la firma con el algoritmo permitido y el vencimiento, y adjunta el id del usuario a la solicitud. Si falla, responde `401` con `{"error":"No autorizado"}`.
4. `GET /api/auth/me` usa el middleware y responde con los datos seguros del usuario autenticado.
5. Las rutas de clientes, productos, facturas y detalles de factura usan el middleware. React agrega el Bearer en un servicio común; al cerrar sesión elimina el token del contexto.

## Alcance y límites

Esta es una implementación didáctica de acceso con bearer tokens, no una plataforma de identidad para producción. No incluye refresh tokens, roles, recuperación de contraseña ni revocación inmediata de JWT ya emitidos. Un JWT firmado se valida localmente hasta su expiración; por eso se mantiene corto el plazo y no se incluye información sensible. La contraseña nunca se devuelve ni se incorpora al token.

## Fuentes consultadas

- IETF, [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html), formato y claims registrados, incluido `exp`.
- IETF, [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html), validación del algoritmo y prácticas para tokens firmados.
- Auth0, [node-jsonwebtoken README](https://github.com/auth0/node-jsonwebtoken/blob/master/README.md), opciones `expiresIn`, `jwt.sign` y `jwt.verify`.
- Proyecto `bcrypt`, [README de bcrypt para Node.js](https://github.com/kelektiv/node.bcrypt.js/blob/master/README.md), creación de hashes y comparación de contraseñas.
- OWASP, [JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html) y [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), riesgos del token y almacenamiento web.

Consulta de fuentes: 5 de noviembre de 2026.
