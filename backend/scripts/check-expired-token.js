const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');

async function checkExpiredToken() {
  const baseUrl = process.argv[2] || 'http://localhost:3002/api';
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing from backend/.env.');
  const token = jwt.sign({ sub: '1' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -1 });
  const response = await fetch(`${baseUrl}/clientes`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status !== 401) throw new Error(`Expired token returned HTTP ${response.status}, expected HTTP 401.`);
  console.log('OK expired JWT -> HTTP 401');
}

checkExpiredToken().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
