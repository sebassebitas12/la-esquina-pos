const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3002/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, token, onUnauthorized } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch {
    throw new ApiError('No se pudo conectar con la API. Revisá que el servidor esté activo.');
  }

  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(result.error || 'La solicitud no se pudo completar.', response.status);
  }
  return result;
}

export const authApi = {
  registrar: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  iniciarSesion: (payload) => request('/auth/login', { method: 'POST', body: payload })
};

function resourceApi(path, send) {
  return {
    listar: () => send(`/${path}`),
    obtener: (id) => send(`/${path}/${id}`),
    crear: (payload) => send(`/${path}`, { method: 'POST', body: payload }),
    actualizar: (id, payload) => send(`/${path}/${id}`, { method: 'PUT', body: payload }),
    eliminar: (id) => send(`/${path}/${id}`, { method: 'DELETE' }),
    accion: (id, action) => send(`/${path}/${id}/${action}`, { method: 'POST' })
  };
}

const endpoints = {
  clientes: 'clientes', categorias: 'categorias', marcas: 'marcas', 'unidades-medida': 'unidades-medida',
  productos: 'productos', proveedores: 'proveedores', 'productos-proveedores': 'productos-proveedores',
  compras: 'compras', 'detalles-compra': 'detalles-compra', facturas: 'facturas',
  'detalles-factura': 'detalles-factura', 'metodos-pago': 'metodos-pago', pagos: 'pagos',
  existencias: 'existencias', 'movimientos-inventario': 'movimientos-inventario',
  devoluciones: 'devoluciones', 'detalles-devolucion': 'detalles-devolucion'
};

export async function checkApiHealth() {
  return request('/health');
}

export function createApiClient(token, onUnauthorized) {
  const send = async (path, options = {}) => {
    const result = await request(path, { ...options, token, onUnauthorized });
    return result?.data ?? result;
  };

  return {
    auth: { me: () => send('/auth/me') },
    ai: { consulta: (pregunta) => send('/ai/consulta', { method: 'POST', body: { pregunta } }) },
    ...Object.fromEntries(Object.entries(endpoints).map(([key, path]) => [key, resourceApi(path, send)]))
  };
}
