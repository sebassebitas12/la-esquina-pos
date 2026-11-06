function toCents(value) {
  const [whole, fraction = ''] = String(value).split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function lineTotalCents(price, quantity) {
  return Math.round(toCents(price) * Math.round(Number(quantity) * 1000) / 1000);
}

function fromCents(value) {
  return (value / 100).toFixed(2);
}

module.exports = { toCents, lineTotalCents, fromCents };
