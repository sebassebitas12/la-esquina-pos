function isValidQuantity(value, { allowNegative = false } = {}) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const pattern = allowNegative ? /^-?\d{1,9}(?:\.\d{1,3})?$/ : /^\d{1,9}(?:\.\d{1,3})?$/;
  return pattern.test(String(value)) && Number(value) !== 0 && Number.isFinite(Number(value));
}

function toMilli(value) {
  return Math.round(Number(value) * 1000);
}

function fromMilli(value) {
  return (value / 1000).toFixed(3);
}

module.exports = { isValidQuantity, toMilli, fromMilli };
