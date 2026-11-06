function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

function validateBody(body, allowedFields, requiredFields = [], partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'El cuerpo debe ser un objeto JSON.';
  if (partial && Object.keys(body).length === 0) return 'Enviá al menos un campo para actualizar.';
  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    return 'El cuerpo contiene campos no permitidos.';
  }
  const missingField = requiredFields.find((field) => !Object.hasOwn(body, field));
  if (missingField) return `El campo ${missingField} es obligatorio.`;
  return null;
}

function isValidName(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 150;
}

function isValidMoney(value) {
  return (typeof value === 'string' || typeof value === 'number')
    && /^\d{1,8}(?:\.\d{1,2})?$/.test(String(value));
}

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

module.exports = { parseId, validateBody, isValidName, isValidMoney, isValidDateOnly };
