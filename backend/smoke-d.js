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

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  await pg.query('DELETE FROM "CashRegisterSession" WHERE "restaurantId"=1');
  await pg.query('DELETE FROM "Tab" WHERE "restaurantId"=1');

  const OWNER = await login('demo@cardapiopedeai.com.br', 'TestSmoke2026!');

  // Open a session for OWNER
  let r = await req('POST', '/cash-register-sessions', { valorInicial: 200 }, OWNER);
  const SESSION_ID = r.body.id;
  console.log('Setup: session', SESSION_ID, 'OPEN valorInicial=200');

  // Tab + Order + DINHEIRO payment
  r = await req('POST', '/tabs', { tipo: 'SALAO' }, OWNER);
  const TAB_ID = r.body.id;
  await req('POST', '/orders/manual', {
    tabId: TAB_ID, customerName: 'Test', customerPhone: '11999999999',
    deliveryType: 'DINE_IN', items: [{ productId: 1, quantity: 1, unitPrice: 30 }]
  }, OWNER);
  console.log('Setup: tab', TAB_ID);

  // D.1
  r = await req('POST', '/tabs/' + TAB_ID + '/payments', { metodo: 'DINHEIRO', valor: 30 }, OWNER);
  const PAY_DINHEIRO_ID = r.body.id;
  console.log('\nD.1 Create DINHEIRO PENDING:', r.status,
    JSON.stringify({ id: PAY_DINHEIRO_ID, metodo: r.body.metodo, status: r.body.status }));

  // D.2
  r = await req('PATCH', '/tabs/' + TAB_ID + '/payments/' + PAY_DINHEIRO_ID + '/confirm', null, OWNER);
  console.log('D.2 Confirm DINHEIRO (session open):', r.status,
    JSON.stringify({ status: r.body.status, cashRegisterSessionId: r.body.cashRegisterSessionId }));
  let sql = await pg.query('SELECT status, "cashRegisterSessionId", metodo FROM "Payment" WHERE id=$1', [PAY_DINHEIRO_ID]);
  console.log('  SQL D.2 Payment:', JSON.stringify(sql.rows[0]));
  sql = await pg.query('SELECT tipo, origem, valor, "paymentId", "cashRegisterSessionId" FROM "CashMovement" WHERE "paymentId"=$1', [PAY_DINHEIRO_ID]);
  console.log('  SQL D.2 CashMovement:', JSON.stringify(sql.rows[0]));

  // D.3
  r = await req('GET', '/cash-register-sessions/' + SESSION_ID + '/report', null, OWNER);
  console.log('D.3 Report PAYMENT_CASH:', r.status,
    JSON.stringify({ totalEntradas: r.body.totalEntradas, entradasPorOrigem: r.body.entradasPorOrigem }));

  // D.4 — close session, then try confirm DINHEIRO on new tab
  await req('POST', '/cash-register-sessions/' + SESSION_ID + '/close', { valorContado: 230 }, OWNER);
  r = await req('POST', '/tabs', { tipo: 'SALAO' }, OWNER);
  const TAB2_ID = r.body.id;
  await req('POST', '/orders/manual', {
    tabId: TAB2_ID, customerName: 'Test2', customerPhone: '11888888888',
    deliveryType: 'DINE_IN', items: [{ productId: 1, quantity: 1, unitPrice: 25 }]
  }, OWNER);
  r = await req('POST', '/tabs/' + TAB2_ID + '/payments', { metodo: 'DINHEIRO', valor: 25 }, OWNER);
  const PAY2_ID = r.body.id;
  r = await req('PATCH', '/tabs/' + TAB2_ID + '/payments/' + PAY2_ID + '/confirm', null, OWNER);
  console.log('D.4 Confirm DINHEIRO (no session):', r.status, r.body.message);

  // D.5
  r = await req('POST', '/tabs/' + TAB2_ID + '/payments', { metodo: 'PIX', valor: 25 }, OWNER);
  const PAY_PIX_ID = r.body.id;
  r = await req('PATCH', '/tabs/' + TAB2_ID + '/payments/' + PAY_PIX_ID + '/confirm', null, OWNER);
  console.log('D.5 Confirm PIX (no session):', r.status,
    JSON.stringify({ status: r.body.status, cashRegisterSessionId: r.body.cashRegisterSessionId }));
  sql = await pg.query('SELECT COUNT(*) FROM "CashMovement" WHERE "paymentId"=$1', [PAY_PIX_ID]);
  console.log('  SQL D.5 CashMovement count:', sql.rows[0].count, '(esperado 0)');

  // D.6 — FIADO sem customer
  r = await req('POST', '/tabs', { tipo: 'SALAO' }, OWNER);
  const TAB3_ID = r.body.id;
  await req('POST', '/orders/manual', {
    tabId: TAB3_ID, customerName: 'Anonimo', customerPhone: '11777777777',
    deliveryType: 'DINE_IN', items: [{ productId: 1, quantity: 1, unitPrice: 20 }]
  }, OWNER);
  r = await req('POST', '/tabs/' + TAB3_ID + '/payments', { metodo: 'FIADO', valor: 20 }, OWNER);
  console.log('D.6 FIADO sem customer:', r.status, r.body.message);

  // D.7 — fiadoLimite=0
  const custRow = await pg.query('SELECT id FROM "Customer" WHERE "restaurantId"=1 LIMIT 1');
  const CUST_ID = custRow.rows[0].id;
  await pg.query('UPDATE "Tab" SET "customerId"=$1 WHERE id=$2', [CUST_ID, TAB3_ID]);
  await pg.query('UPDATE "Customer" SET "fiadoLimite"=0, "fiadoTotal"=0 WHERE id=$1', [CUST_ID]);
  r = await req('POST', '/tabs/' + TAB3_ID + '/payments', { metodo: 'FIADO', valor: 20 }, OWNER);
  console.log('D.7 FIADO limite=0:', r.status, r.body.message);

  // D.8 — fiadoLimite=100, FIADO R$50
  await pg.query('UPDATE "Customer" SET "fiadoLimite"=100, "fiadoTotal"=0 WHERE id=$1', [CUST_ID]);
  r = await req('POST', '/tabs/' + TAB3_ID + '/payments', { metodo: 'FIADO', valor: 50 }, OWNER);
  const PAY_FIADO_ID = r.body.id;
  console.log('D.8 FIADO R$50 (limite=100):', r.status,
    JSON.stringify({ id: PAY_FIADO_ID, metodo: r.body.metodo, status: r.body.status }));
  sql = await pg.query('SELECT "fiadoTotal", "fiadoLimite" FROM "Customer" WHERE id=$1', [CUST_ID]);
  console.log('  SQL D.8 Customer:', JSON.stringify(sql.rows[0]));
  sql = await pg.query('SELECT tipo, valor, "saldoAposTransacao", "tabId", "paymentId" FROM "FiadoTransaction" WHERE "paymentId"=$1', [PAY_FIADO_ID]);
  console.log('  SQL D.8 FiadoTransaction:', JSON.stringify(sql.rows[0]));

  // D.9 — saldo=50+60=110 > limite=100
  r = await req('POST', '/tabs', { tipo: 'SALAO' }, OWNER);
  const TAB4_ID = r.body.id;
  await pg.query('UPDATE "Tab" SET "customerId"=$1 WHERE id=$2', [CUST_ID, TAB4_ID]);
  await req('POST', '/orders/manual', {
    tabId: TAB4_ID, customerName: 'Test', customerPhone: '11666666666',
    deliveryType: 'DINE_IN', items: [{ productId: 1, quantity: 1, unitPrice: 60 }]
  }, OWNER);
  r = await req('POST', '/tabs/' + TAB4_ID + '/payments', { metodo: 'FIADO', valor: 60 }, OWNER);
  console.log('D.9 FIADO R$60 (saldo=50+60=110>100):', r.status, r.body.message);

  // D.10 — Race condition documentada
  console.log('D.10 Race condition FIADO: TODO (SELECT FOR UPDATE futuro)');

  await pg.end();
  console.log('\n=== Smoke D complete ===');
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
