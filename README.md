# Minimercado La Esquina — Sistema POS & Gestión Comercial

Sistema comercial integral para minimercados y comercio minorista, compuesto por una **API REST robusta con Express, Sequelize y MySQL**, y un **Frontend moderno en React 19 + Vite** bajo estándares de diseño comercial de alto nivel (anti-AI-slop, Geist, Pill Nav sólida y login sin scroll).

---

## 🏛️ Arquitectura del Sistema

El modelo relacional cuenta con **18 tablas** transaccionales que gestionan el ciclo completo de inventario, abastecimiento, facturación de caja y devoluciones:

| Módulo | Entidades Principales |
|---|---|
| **Acceso y Operación** | `usuarios`, `clientes`, `facturas`, `detalle_factura` |
| **Catálogo y Productos** | `categorias`, `marcas`, `unidades_medida`, `productos` |
| **Abastecimiento y Proveedores** | `proveedores`, `productos_proveedores`, `compras`, `detalles_compra` |
| **Punto de Venta e Inventario** | `metodos_pago`, `pagos`, `existencias`, `movimientos_inventario` |
| **Devoluciones** | `devoluciones`, `detalles_devolucion` |

Todas las operaciones críticas (confirmación de facturas, recepción de compras y devoluciones) se ejecutan bajo **transacciones ACID en MySQL**, garantizando la coherencia exacta del stock.

---

## ✨ Características del Frontend

* **Diseño Comercial Profesional:** Interfaz oscura mate (`#121316`, `#181b22`) calibrada para retail, tipografía Geist y cero emojis infantiles.
* **Navegación Pill Nav Sólida:** Barra flotante superior centrada con superficie mate opaca, evitando desenfoques traslúcidos que afecten la legibilidad.
* **Login de Tarjeta Centrada Sin Scroll:** Pantalla de acceso ultra-compacta, perfectamente contenida en el viewport sin barras de desplazamiento vertical.
* **Punto de Venta / Caja Rápida:** Facturación ágil con cliente predeterminado (*Consumidor Final / Mostrador*) y soporte para múltiples formas de pago (Efectivo, Sinpe Móvil, Tarjeta).
* **Asistencia con Inteligencia Artificial:** Integración de endpoints para autocompletado de productos y asistencia de inventario con DeepSeek AI vía backend seguro.

---

## 🚀 Puesta en Marcha Local

### Requisitos Previos
* **Node.js** v20+ y **npm**.
* **MySQL Server** en ejecución.

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/sebassebitas12/la-esquina-pos.git
cd la-esquina-pos
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Configurar Variables de Entorno
Copia `backend/.env.example` a `backend/.env`:
```env
PORT=3002
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=miniproyecto_ventas_development
DB_USER=root
DB_PASSWORD=tu_password
JWT_SECRET=super_secreto_de_al_menos_32_caracteres_aleatorios
DEEPSEEK_API_KEY=tu_clave_de_deepseek_opcional
```

### 3. Base de Datos y Datos Semilla
Desde la carpeta raíz:
```bash
# Crear base de datos y correr migraciones
npm run db:create
npm run db:migrate

# Cargar catálogo inicial de Costa Rica (Leche Dos Pinos, Arroz Tío Pelón, Coca Cola, etc.)
node backend/scripts/seed-mercado.js
```

### 4. Iniciar Servidores de Desarrollo
```bash
# Terminal 1: Backend API (Puerto 3002)
npm run dev:backend

# Terminal 2: Frontend Vite (Puerto 5174)
npm run dev:frontend
```

* **Frontend:** [http://127.0.0.1:5174](http://127.0.0.1:5174)
* **Backend API:** [http://localhost:3002/api](http://localhost:3002/api)

---

## 🔐 Seguridad y Autenticación

* Autenticación basada en **JWT (JSON Web Tokens)** con expiración y hash de contraseñas mediante **bcrypt**.
* Reseteo automático de controles nativos del navegador (`color-scheme: dark`) y protección estricta contra inyecciones SQL vía consultas parametrizadas de Sequelize.
* Las API keys de IA y credenciales residen exclusivamente en el servidor backend; el frontend no expone secretos.

---

## 🧪 Pruebas y Validación

```bash
# Pruebas smoke de clientes y autenticación
npm run smoke:clients
npm run smoke:api

# Pruebas integrales de flujo transaccional de negocio
npm run smoke:domain
```

Colección de pruebas para Thunder Client / Postman disponible en `docs/thunder-client-dia-2.postman_collection.json`.
