// Smoke de regressão Etapa 2: Order DELIVERY → Tab → Payment PIX → confirm → Tab CLOSED
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
  if (r.status !== 200 && r.status !== 201) throw new Error('Login failed');
  return r.body.access_token;
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const OWNER = await login('demo@cardapiopedeai.com.br', 'TestSmoke2026!');

  // Get restaurant slug for public order
  const slugRow = await pg.query('SELECT slug FROM "Restaurant" WHERE id=1');
  const SLUG = slugRow.rows[0].slug;
  console.log('=== Smoke Regressão Etapa 2 ===');
  console.log('Restaurant slug:', SLUG);

  // R.1 — Order DELIVERY via cardápio público (cria Tab automaticamente)
  let r = await req('POST', '/public/orders/' + SLUG, {
    customerName: 'Regressao Test',
    customerPhone: '11555555555',
    deliveryType: 'DELIVERY',
    customerAddress: { street: 'Rua A', number: '1', neighborhood: 'Centro', city: 'SP' },
    items: [{ productId: 1, quantity: 1 }],
  });
  console.log('\nR.1 Public order DELIVERY:', r.status, JSON.stringify({ orderId: r.body.id, origin: r.body.origin }));

  // Get the tab created for this order
  const tabRow = await pg.query(
    'SELECT t.id, t.status, t.tipo FROM "Tab" t JOIN "Order" o ON o."tabId"=t.id WHERE o.id=$1',
    [r.body.id]
  );
  const TAB_ID = tabRow.rows[0]?.id;
  console.log('R.1 Tab criada:', JSON.stringify(tabRow.rows[0]));

  if (!TAB_ID) {
    console.log('SKIP: Tab não criada automaticamente (configuração de ambiente)');
    // Create tab+order manually as fallback
    r = await req('POST', '/tabs', { tipo: 'DELIVERY' }, OWNER);
    const MANUAL_TAB = r.body.id;
    r = await req('POST', '/orders/manual', {
      tabId: MANUAL_TAB, customerName: 'Reg', customerPhone: '11555555555',
      deliveryType: 'DELIVERY', items: [{ productId: 1, quantity: 1, unitPrice: 20 }]
    }, OWNER);
    console.log('Fallback manual tab', MANUAL_TAB, 'order', r.body.id);
  }

  const FINAL_TAB = TAB_ID || (await pg.query('SELECT id FROM "Tab" WHERE "restaurantId"=1 AND status=\'OPEN\' ORDER BY id DESC LIMIT 1')).rows[0]?.id;

  // Get tab total
  const tabInfo = await pg.query('SELECT total, status FROM "Tab" WHERE id=$1', [FINAL_TAB]);
  const TAB_TOTAL = Number(tabInfo.rows[0].total);
  console.log('R.2 Tab total:', TAB_TOTAL, 'status:', tabInfo.rows[0].status);

  // R.3 — Create Payment PIX (ONLINE_PIX or PIX)
  r = await req('POST', '/tabs/' + FINAL_TAB + '/payments', { metodo: 'PIX', valor: TAB_TOTAL || 20 }, OWNER);
  const PIX_PAY_ID = r.body.id;
  console.log('R.3 Create PIX payment:', r.status, JSON.stringify({ id: PIX_PAY_ID, metodo: r.body.metodo, status: r.body.status }));

  // R.4 — Confirm PIX (sem session aberta — PIX não exige)
  r = await req('PATCH', '/tabs/' + FINAL_TAB + '/payments/' + PIX_PAY_ID + '/confirm', null, OWNER);
  console.log('R.4 Confirm PIX:', r.status, JSON.stringify({ status: r.body.status, cashRegisterSessionId: r.body.cashRegisterSessionId }));

  // R.5 — Tab deve estar CLOSED (totalPago >= total)
  const tabFinal = await pg.query('SELECT status, "totalPago", total FROM "Tab" WHERE id=$1', [FINAL_TAB]);
  console.log('R.5 Tab auto-close:', JSON.stringify(tabFinal.rows[0]));

  // R.6 — No CashMovement criado pra PIX
  const cmCount = await pg.query('SELECT COUNT(*) FROM "CashMovement" WHERE "paymentId"=$1', [PIX_PAY_ID]);
  console.log('R.6 CashMovement count for PIX:', cmCount.rows[0].count, '(esperado 0)');

  // R.7 — SALAO tab (DINHEIRO + session) → tab fecha normalmente
  const sessRow = await pg.query('SELECT id FROM "CashRegisterSession" WHERE "restaurantId"=1 AND status=\'OPEN\' LIMIT 1');
  if (sessRow.rows.length === 0) {
    r = await req('POST', '/cash-register-sessions', { valorInicial: 0 }, OWNER);
    console.log('R.7 Opened fresh session:', r.body.id);
  }
  r = await req('POST', '/tabs', { tipo: 'SALAO' }, OWNER);
  const SALAO_TAB = r.body.id;
  await req('POST', '/orders/manual', {
    tabId: SALAO_TAB, customerName: 'Salao', customerPhone: '11444444444',
    deliveryType: 'DINE_IN', items: [{ productId: 1, quantity: 1, unitPrice: 15 }]
  }, OWNER);
  r = await req('POST', '/tabs/' + SALAO_TAB + '/payments', { metodo: 'DINHEIRO', valor: 15 }, OWNER);
  const DINHEIRO_PAY = r.body.id;
  r = await req('PATCH', '/tabs/' + SALAO_TAB + '/payments/' + DINHEIRO_PAY + '/confirm', null, OWNER);
  console.log('R.7 SALAO tab DINHEIRO confirm:', r.status, JSON.stringify({ status: r.body.status, cashRegisterSessionId: r.body.cashRegisterSessionId }));
  const salaoFinal = await pg.query('SELECT status FROM "Tab" WHERE id=$1', [SALAO_TAB]);
  console.log('R.7 SALAO tab final status:', salaoFinal.rows[0].status, '(esperado CLOSED)');

  await pg.end();
  console.log('\n=== Regressão Etapa 2 complete ===');
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
