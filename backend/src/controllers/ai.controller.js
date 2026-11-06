const { Producto, Existencia, Factura, DetalleFactura } = require('../../models');
const { lineTotalCents, fromCents } = require('../utils/money');

const SYSTEM_PROMPT = 'Eres el asistente comercial inteligente del minimercado La Esquina. Ayuda al dueño a entender su inventario y ventas con respuestas breves y directas.';
const PLACEHOLDER_KEY = 'tu_clave_aqui';
const DEEPSEEK_MODEL = 'deepseek-flash';

function todayInCostaRica() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

async function getBusinessContext() {
  const fecha = todayInCostaRica();
  const [productosRegistrados, existencias, facturasHoy] = await Promise.all([
    Producto.count(),
    Existencia.findAll({
      attributes: ['productoId', 'cantidadActual', 'cantidadMinima'],
      include: [{ model: Producto, as: 'producto', attributes: ['nombre', 'sku'], required: true }]
    }),
    Factura.findAll({
      where: { fecha, estado: 'confirmada' },
      attributes: ['id'],
      include: [{ model: DetalleFactura, as: 'detalles', attributes: ['cantidad', 'precioUnitario'], required: false }]
    })
  ]);

  const lowStock = existencias
    .filter((stock) => Number(stock.cantidadActual) <= Number(stock.cantidadMinima))
    .map((stock) => ({
      producto: stock.producto.nombre,
      sku: stock.producto.sku,
      cantidadActual: Number(stock.cantidadActual),
      cantidadMinima: Number(stock.cantidadMinima)
    }));
  const ventasCents = facturasHoy.reduce((invoiceTotal, invoice) => invoiceTotal + (invoice.detalles || []).reduce(
    (lineTotal, line) => lineTotal + lineTotalCents(line.precioUnitario, line.cantidad),
    0
  ), 0);

  return {
    fecha,
    productosRegistrados,
    existenciasBajasTotal: lowStock.length,
    existenciasBajasMostradas: Math.min(lowStock.length, 30),
    existenciasBajas: lowStock.slice(0, 30),
    ventasHoy: {
      facturasConfirmadas: facturasHoy.length,
      totalCRC: Number(fromCents(ventasCents))
    }
  };
}

async function consulta(req, res) {
  const pregunta = req.body?.pregunta;
  if (typeof pregunta !== 'string' || !pregunta.trim() || pregunta.trim().length > 1000) {
    return res.status(400).json({ error: 'La pregunta es obligatoria y debe tener hasta 1000 caracteres.' });
  }
  if (Object.keys(req.body || {}).some((field) => field !== 'pregunta')) {
    return res.status(400).json({ error: 'La solicitud solo admite el campo pregunta.' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey || apiKey === PLACEHOLDER_KEY) {
    return res.status(503).json({ error: 'Configurá DEEPSEEK_API_KEY en backend/.env para activar el asistente.' });
  }

  const context = await getBusinessContext();
  const userMessage = [
    `Consulta del dueño: ${pregunta.trim()}`,
    'Datos actuales de la tienda en formato JSON:',
    JSON.stringify(context),
    'Respondé con base en esos datos. Si no contienen la información solicitada, decilo claramente y no inventés cifras.'
  ].join('\n\n');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let upstream;
  let result;

  try {
    upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 600,
        stream: false
      }),
      signal: controller.signal
    });
    result = await upstream.json().catch(() => null);
  } catch (error) {
    if (error.name === 'AbortError') return res.status(504).json({ error: 'El asistente tardó demasiado en responder. Intentá de nuevo.' });
    console.error('DeepSeek fetch failed:', error.name, error.cause?.code || 'no error code');
    return res.status(502).json({ error: 'No se pudo conectar con el servicio del asistente.' });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    if (upstream.status === 401) return res.status(502).json({ error: 'DeepSeek rechazó la clave. Revisá DEEPSEEK_API_KEY en backend/.env.' });
    if (upstream.status === 402) return res.status(502).json({ error: 'La cuenta de DeepSeek no tiene saldo disponible.' });
    if (upstream.status === 429) return res.status(503).json({ error: 'DeepSeek alcanzó el límite de consultas. Esperá un momento e intentá de nuevo.' });
    if (upstream.status === 400 || upstream.status === 422) return res.status(502).json({ error: 'DeepSeek rechazó la consulta. Revisá el modelo y los parámetros enviados.' });
    return res.status(502).json({ error: 'DeepSeek no pudo completar la consulta en este momento.' });
  }

  const respuesta = result?.choices?.[0]?.message?.content?.trim();
  if (!respuesta) return res.status(502).json({ error: 'El asistente no devolvió una respuesta utilizable.' });
  return res.status(200).json({ data: { respuesta, contexto: context } });
}

module.exports = { consulta };
