// Regressão Etapa 2 — v3: usa createManual corretamente (paymentMethod obrigatório)
require('dotenv').config();
const http = require('http');
const { Client } = require('pg');

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', e => resolve({ status: 0, error: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

async function login(email, password) {
  const r = await req('POST', '/auth/login', { email, password });
  if (r.status !== 200 && r.status !== 201) throw new Error('Login failed: ' + JSON.stringify(r.body));
  return r.body.access_token;
}

// Creates order via /orders/manual and returns { tabId, paymentId }
async function createOrderAndGetPayment(token, paymentMethod, customerName, customerPhone) {
  const r = await req('POST', '/orders/manual', {
    customerName,
    customerPhone,
    deliveryType: 'DINE_IN',
    paymentMethod, // CASH or PIX
    items: [{ productId: 1, quantity: 1 }],
  }, token);
  if (r.status !== 200 && r.status !== 201) {
    throw new Error('createManual failed: ' + JSON.stringify(r.body));
  }
  const tabId = r.body.tabId;
  const paymentsResp = await req('GET', '/tabs/' + tabId + '/payments', null, token);
  const pending = paymentsResp.body.find(p => p.status === 'PENDING');
  if (!pending) throw new Error('No PENDING payment found on tab ' + tabId);
  return { tabId, paymentId: pending.id, orderTotal: r.body.total };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Cleanup
  await pg.query('DELETE FROM "CashRegisterSession" WHERE "restaurantId"=1');
  await pg.query('DELETE FROM "Tab" WHERE "restaurantId"=1');

  const OWNER = await login('demo@cardapiopedeai.com.br', 'TestSmoke2026!');

  console.log('=== Smoke Regressão Etapa 2 (v3) ===\n');

  // ── REG-1: PIX confirm sem session → OK, tab CLOSED, sem CashMovement ────────
  const reg1 = await createOrderAndGetPayment(OWNER, 'PIX', 'Reg PIX', '11111111111');
  console.log('REG-1 order+tab:', JSON.stringify({ tabId: reg1.tabId, paymentId: reg1.paymentId, total: reg1.orderTotal }));

  let r = await req('PATCH', '/tabs/' + reg1.tabId + '/payments/' + reg1.paymentId + '/confirm', null, OWNER);
  console.log('REG-1 PIX confirm:', r.status,
    JSON.stringify({ status: r.body?.status, cashRegisterSessionId: r.body?.cashRegisterSessionId }),
    '(esperado 200, sessId=null)');

  let tabFinal = await pg.query('SELECT status, "totalPago", total FROM "Tab" WHERE id=$1', [reg1.tabId]);
  console.log('REG-1 tab after PIX:', JSON.stringify(tabFinal.rows[0]), '(esperado CLOSED)');

  let cmCount = await pg.query('SELECT COUNT(*) FROM "CashMovement" WHERE "paymentId"=$1', [reg1.paymentId]);
  console.log('REG-1 CashMovement pra PIX:', cmCount.rows[0].count, '(esperado 0)\n');

  // ── REG-2: DINHEIRO confirm COM session → OK + CashMovement criado ────────────
  r = await req('POST', '/cash-register-sessions', { valorInicial: 50 }, OWNER);
  const SESS = r.body.id;
  console.log('REG-2 session aberta:', SESS);

  const reg2 = await createOrderAndGetPayment(OWNER, 'CASH', 'Reg DIN', '11222222222');
  console.log('REG-2 order+tab:', JSON.stringify({ tabId: reg2.tabId, paymentId: reg2.paymentId, total: reg2.orderTotal }));

  r = await req('PATCH', '/tabs/' + reg2.tabId + '/payments/' + reg2.paymentId + '/confirm', null, OWNER);
  console.log('REG-2 DINHEIRO confirm:', r.status,
    JSON.stringify({ status: r.body?.status, cashRegisterSessionId: r.body?.cashRegisterSessionId }),
    '(esperado 200, sessId=' + SESS + ')');

  tabFinal = await pg.query('SELECT status, "totalPago", total FROM "Tab" WHERE id=$1', [reg2.tabId]);
  console.log('REG-2 tab after DINHEIRO:', JSON.stringify(tabFinal.rows[0]), '(esperado CLOSED)');

  let sqlCM = await pg.query(
    'SELECT tipo, origem, valor, "paymentId" FROM "CashMovement" WHERE "paymentId"=$1',
    [reg2.paymentId],
  );
  console.log('REG-2 CashMovement:', JSON.stringify(sqlCM.rows[0]), '(esperado PAYMENT_CASH)\n');

  // ── REG-3: DINHEIRO sem session → 400 ─────────────────────────────────────────
  await req('POST', '/cash-register-sessions/' + SESS + '/close', { valorContado: 95 }, OWNER);

  const reg3 = await createOrderAndGetPayment(OWNER, 'CASH', 'NoSess', '11333333333');
  r = await req('PATCH', '/tabs/' + reg3.tabId + '/payments/' + reg3.paymentId + '/confirm', null, OWNER);
  console.log('REG-3 DINHEIRO sem session:', r.status, r.body?.message, '(esperado 400)\n');

  // ── REG-4: Refund ainda funciona ──────────────────────────────────────────────
  r = await req('POST', '/cash-register-sessions', { valorInicial: 0 }, OWNER);
  const SESS2 = r.body.id;

  const reg4 = await createOrderAndGetPayment(OWNER, 'CASH', 'Refund', '11444444444');
  await req('PATCH', '/tabs/' + reg4.tabId + '/payments/' + reg4.paymentId + '/confirm', null, OWNER);
  r = await req('PATCH', '/tabs/' + reg4.tabId + '/payments/' + reg4.paymentId + '/refund', null, OWNER);
  console.log('REG-4 Refund:', r.status, JSON.stringify({ status: r.body?.status }), '(esperado REFUNDED)');
  tabFinal = await pg.query('SELECT status FROM "Tab" WHERE id=$1', [reg4.tabId]);
  console.log('REG-4 tab após refund:', tabFinal.rows[0].status, '(esperado OPEN — reabre)\n');

  // Cleanup SESS2
  await req('POST', '/cash-register-sessions/' + SESS2 + '/close', { valorContado: 0 }, OWNER);

  await pg.end();
  console.log('=== Regressão Etapa 2 v3 complete ===');
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
