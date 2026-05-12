// Smoke Fase E — Fiado Management
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

  // Cleanup sessions
  await pg.query('DELETE FROM "CashRegisterSession" WHERE "restaurantId"=1');

  const OWNER = await login('demo@cardapiopedeai.com.br', 'TestSmoke2026!');
  const CASHIER = await login('caixa-smoke@test.com', 'TestSmoke2026!');

  // Setup: seed customer with known fiadoTotal=80, fiadoLimite=0 (will be set by test)
  const CUST_ID = 4; // Fernanda Costa
  await pg.query('UPDATE "Customer" SET "fiadoTotal"=80, "fiadoLimite"=0 WHERE id=$1', [CUST_ID]);

  console.log('=== Smoke Fase E — Fiado Management ===\n');

  // ── E.1: GET fiado — saldo inicial ───────────────────────────────────────────
  let r = await req('GET', '/customers/' + CUST_ID + '/fiado', null, OWNER);
  console.log('E.1 GET fiado:', r.status,
    JSON.stringify({ fiadoTotal: r.body.fiadoTotal, fiadoLimite: r.body.fiadoLimite, disponivel: r.body.disponivel }),
    '(esperado 200, total=80, limite=0, disponivel=-80)');

  // ── E.2: PATCH fiado-limite → OWNER sucesso ───────────────────────────────────
  r = await req('PATCH', '/customers/' + CUST_ID + '/fiado-limite', { fiadoLimite: 200 }, OWNER);
  console.log('E.2 PATCH fiado-limite (OWNER):', r.status,
    JSON.stringify({ fiadoLimite: r.body.fiadoLimite }),
    '(esperado 200, limite=200)');

  let sql = await pg.query('SELECT "fiadoLimite" FROM "Customer" WHERE id=$1', [CUST_ID]);
  console.log('  SQL E.2 fiadoLimite:', sql.rows[0].fiadoLimite, '(esperado 200)');
  sql = await pg.query("SELECT action, meta FROM \"AuditLog\" WHERE entity='Customer' AND \"entityId\"=$1 ORDER BY \"createdAt\" DESC LIMIT 1", [CUST_ID]);
  console.log('  SQL E.2 AuditLog:', JSON.stringify(sql.rows[0]));

  // ── E.3: PATCH fiado-limite < saldo → 400 ───────────────────────────────────
  r = await req('PATCH', '/customers/' + CUST_ID + '/fiado-limite', { fiadoLimite: 50 }, OWNER);
  console.log('E.3 PATCH limite<saldo:', r.status, r.body.message, '(esperado 400)\n');

  // ── E.4: CASHIER tenta PATCH fiado-limite → 403 ──────────────────────────────
  r = await req('PATCH', '/customers/' + CUST_ID + '/fiado-limite', { fiadoLimite: 300 }, CASHIER);
  console.log('E.4 CASHIER PATCH fiado-limite:', r.status, r.body.message, '(esperado 403)\n');

  // ── E.5: POST fiado-payments PIX → CREDITO, fiadoTotal cai, sem CashMovement ─
  r = await req('POST', '/customers/' + CUST_ID + '/fiado-payments', {
    valor: 30, metodo: 'PIX', observacao: 'Quitacao parcial PIX'
  }, OWNER);
  console.log('E.5 fiado-payment PIX:', r.status,
    JSON.stringify({ novoSaldo: r.body.novoSaldo, paymentId: r.body.payment?.id }),
    '(esperado 201, novoSaldo=50)');

  const PIX_PAY_ID = r.body.payment?.id;
  sql = await pg.query('SELECT "fiadoTotal" FROM "Customer" WHERE id=$1', [CUST_ID]);
  console.log('  SQL E.5 fiadoTotal:', sql.rows[0].fiadoTotal, '(esperado 50)');
  sql = await pg.query('SELECT tipo, valor, "saldoAposTransacao" FROM "FiadoTransaction" WHERE "paymentId"=$1', [PIX_PAY_ID]);
  console.log('  SQL E.5 FiadoTransaction:', JSON.stringify(sql.rows[0]), '(esperado CREDITO, 30, saldo=50)');
  sql = await pg.query('SELECT COUNT(*) FROM "CashMovement" WHERE "paymentId"=$1', [PIX_PAY_ID]);
  console.log('  SQL E.5 CashMovement count:', sql.rows[0].count, '(esperado 0)\n');

  // ── E.6: POST fiado-payments valor > saldo → 400 ────────────────────────────
  r = await req('POST', '/customers/' + CUST_ID + '/fiado-payments', {
    valor: 100, metodo: 'PIX'
  }, OWNER);
  console.log('E.6 fiado-payment valor>saldo:', r.status, r.body.message, '(esperado 400)\n');

  // ── E.7: POST fiado-payments DINHEIRO → CREDITO + CashMovement FIADO_QUITACAO
  r = await req('POST', '/cash-register-sessions', { valorInicial: 100 }, OWNER);
  const SESS = r.body.id;
  console.log('E.7 session:', SESS);

  r = await req('POST', '/customers/' + CUST_ID + '/fiado-payments', {
    valor: 20, metodo: 'DINHEIRO', observacao: 'Quitacao dinheiro'
  }, OWNER);
  console.log('E.7 fiado-payment DINHEIRO:', r.status,
    JSON.stringify({ novoSaldo: r.body.novoSaldo, paymentId: r.body.payment?.id }),
    '(esperado 201, novoSaldo=30)');

  const DIN_PAY_ID = r.body.payment?.id;
  sql = await pg.query('SELECT "fiadoTotal" FROM "Customer" WHERE id=$1', [CUST_ID]);
  console.log('  SQL E.7 fiadoTotal:', sql.rows[0].fiadoTotal, '(esperado 30)');
  sql = await pg.query('SELECT tipo, origem, valor, "cashRegisterSessionId" FROM "CashMovement" WHERE "paymentId"=$1', [DIN_PAY_ID]);
  console.log('  SQL E.7 CashMovement:', JSON.stringify(sql.rows[0]), '(esperado ENTRADA, FIADO_QUITACAO)\n');

  // ── E.8: DINHEIRO sem session → 400 ─────────────────────────────────────────
  await req('POST', '/cash-register-sessions/' + SESS + '/close', { valorContado: 120 }, OWNER);
  r = await req('POST', '/customers/' + CUST_ID + '/fiado-payments', {
    valor: 10, metodo: 'DINHEIRO'
  }, OWNER);
  console.log('E.8 DINHEIRO sem session:', r.status, r.body.message, '(esperado 400)\n');

  // ── E.9: GET fiado-transactions paginado ──────────────────────────────────────
  r = await req('GET', '/customers/' + CUST_ID + '/fiado-transactions?skip=0&take=5', null, OWNER);
  console.log('E.9 GET fiado-transactions:', r.status,
    JSON.stringify({ total: r.body.total, returned: r.body.transactions?.length, skip: r.body.skip, take: r.body.take }),
    '(esperado 200, total>=2)');
  console.log('  tipos:', r.body.transactions?.map(t => t.tipo));

  // ── E.10: GET /restaurants/me/fiado-summary ──────────────────────────────────
  r = await req('GET', '/restaurants/me/fiado-summary', null, OWNER);
  console.log('E.10 GET fiado-summary:', r.status,
    JSON.stringify({ totalFiadoAberto: r.body.totalFiadoAberto, totalClientesComFiado: r.body.totalClientesComFiado }),
    '(esperado 200, totalFiadoAberto>=30)');
  console.log('  SQL E.10 topDevedores[0]:', JSON.stringify(r.body.topDevedores?.[0]));

  // CASHIER tenta fiado-summary → 403
  r = await req('GET', '/restaurants/me/fiado-summary', null, CASHIER);
  console.log('E.10b CASHIER fiado-summary:', r.status, r.body.message, '(esperado 403)\n');

  // Cleanup
  await pg.query('UPDATE "Customer" SET "fiadoTotal"=0, "fiadoLimite"=0 WHERE id=$1', [CUST_ID]);

  await pg.end();
  console.log('=== Smoke Fase E complete ===');
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
