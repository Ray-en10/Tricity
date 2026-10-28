// Test d'intégration — lance le vrai serveur contre une MongoDB LOCALE.
//   MongoDB locale démarrée, puis :  npm run test:integration
// Variable optionnelle : TEST_MONGODB_URI (défaut mongodb://127.0.0.1:27017/watt_integration_test)
// Sécurité : refuse tout hôte non local et toute base dont le nom ne finit pas par _test
// (la base est VIDÉE avant et après le test).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');

const URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/watt_integration_test';
const PORT = 5055;
const BASE = `http://127.0.0.1:${PORT}/api`;
const PWD = 'Test-' + crypto.randomBytes(6).toString('hex'); // jetable, généré à chaque run

const parsed = new URL(URI);
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname) ||
    !parsed.pathname.slice(1).endsWith('_test')) {
  throw new Error('Refus : TEST_MONGODB_URI doit être locale et se terminer par _test');
}

let server;
const tok = {};
const ids = {};

async function api(method, url, token, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* corps vide */ }
  return { status: res.status, data };
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/`); if (r.ok) return; } catch { /* pas encore */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Le serveur n\'a pas démarré');
}

before(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  const User = require('../models/User');
  // Premier admin : créé directement en base (aucune route publique ne crée d'admin).
  const admin = await User.create({ name: 'Admin Test', email: 'admin@test.local', password: PWD, role: 'admin' });
  ids.admin = admin._id.toString();

  server = spawn(process.execPath, ['index.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: String(PORT), MONGODB_URI: URI, NODE_ENV: 'test',
      JWT_SECRET: crypto.randomBytes(24).toString('hex'),
      SEED_DEFAULT_DATA: 'false', SMS_ENABLED: 'false', NOTIFICATION_SCHEDULER: 'false', SMTP_HOST: '',
    },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(async () => {
  if (server) server.kill();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('login admin', async () => {
  const r = await api('POST', '/auth/login', null, { email: 'admin@test.local', password: PWD });
  assert.equal(r.status, 200);
  tok.admin = r.data.token;
});

test('register force le rôle client même si role=admin est envoyé', async () => {
  const r = await api('POST', '/auth/register', null,
    { name: 'Client A', email: 'a@test.local', password: PWD, role: 'admin', usageType: 'residentiel' });
  assert.equal(r.status, 201);
  assert.equal(r.data.role, 'client');
  ids.a = r.data._id;
  tok.a = r.data.token;
  const b = await api('POST', '/auth/register', null, { name: 'Client B', email: 'b@test.local', password: PWD });
  ids.b = b.data._id; tok.b = b.data.token;
});

test('create-user : refusé au client, accepté à l\'admin (installateur, responsable_reseau)', async () => {
  const denied = await api('POST', '/auth/create-user', tok.a,
    { name: 'X', email: 'x@test.local', password: PWD, role: 'admin' });
  assert.equal(denied.status, 403);
  const inst = await api('POST', '/auth/create-user', tok.admin,
    { name: 'Inst', email: 'inst@test.local', password: PWD, role: 'installateur' });
  assert.equal(inst.status, 201);
  const mgr = await api('POST', '/auth/create-user', tok.admin,
    { name: 'Resp', email: 'mgr@test.local', password: PWD, role: 'responsable_reseau' });
  assert.equal(mgr.status, 201);
  ids.mgr = mgr.data._id;
  tok.inst = (await api('POST', '/auth/login', null, { email: 'inst@test.local', password: PWD })).data.token;
  tok.mgr = (await api('POST', '/auth/login', null, { email: 'mgr@test.local', password: PWD })).data.token;
});

test('compteur : client refusé ; installateur crée un triphasé -> 3 circuits mesurés + 1 calculé', async () => {
  const denied = await api('POST', '/meters', tok.a, { userId: ids.a, type: 'triphase' });
  assert.equal(denied.status, 403);
  const r = await api('POST', '/meters', tok.inst, { userId: ids.a, type: 'triphase' });
  assert.equal(r.status, 201);
  ids.meterA = r.data.meter._id;
  assert.equal(r.data.circuits.length, 4);
  assert.equal(r.data.circuits.filter(c => c.isCalculated).length, 1);
  ids.circuitsA = r.data.circuits.map(c => c._id);
});

test('maximum 2 compteurs par client', async () => {
  assert.equal((await api('POST', '/meters', tok.inst, { userId: ids.a, type: 'monophase' })).status, 201);
  assert.equal((await api('POST', '/meters', tok.inst, { userId: ids.a, type: 'monophase' })).status, 400);
});

test('contrôle d\'accès : le client B ne voit pas l\'historique du circuit de A', async () => {
  const own = await api('GET', `/circuits/${ids.circuitsA[0]}/history?granularity=day`, tok.a);
  assert.equal(own.status, 200);
  const other = await api('GET', `/circuits/${ids.circuitsA[0]}/history?granularity=day`, tok.b);
  assert.ok([403, 404].includes(other.status), `statut inattendu ${other.status}`);
});

test('harmoniques : en_attente_donnees sans mesure, puis statut après ajout par l\'installateur', async () => {
  const none = await api('GET', `/harmoniques/${ids.meterA}`, tok.a);
  assert.equal(none.status, 200);
  assert.equal(none.data.available, false);
  const add = await api('POST', `/harmoniques/${ids.meterA}`, tok.inst, {
    phases: { L1: { loadKw: 1, thdPercent: 3 }, L2: { loadKw: 1, thdPercent: 3 }, L3: { loadKw: 1, thdPercent: 3 } },
    dephasageDegrees: 1,
  });
  assert.ok([200, 201].includes(add.status), `ajout harmoniques: ${add.status}`);
  const denied = await api('POST', `/harmoniques/${ids.meterA}`, tok.a, { phases: {}, dephasageDegrees: 0 });
  assert.equal(denied.status, 403);
});

test('dashboard-stats : indicateurs jour et cycle présents', async () => {
  const User = require('../models/User');
  await User.updateOne({ _id: ids.a }, { cycleStartDate: new Date(Date.now() - 10 * 86400000) });
  const r = await api('GET', '/stats/dashboard-stats', tok.a);
  assert.equal(r.status, 200);
  assert.ok(r.data.day && r.data.cycle, 'day/cycle manquants');
  assert.ok(r.data.cycle.start && r.data.cycle.end);
});

test('notifications : un dépassement n\'est notifié qu\'une fois (anti-doublon) + compteur non-lus', async () => {
  const Consumption = require('../models/Consumption');
  assert.equal((await api('PATCH', '/stats/objective', tok.a, { objectiveKwh: 1 })).status, 200);
  const now = Date.now();
  const rows = [];
  for (let i = 0; i < 40; i++) {
    rows.push({ userId: ids.a, meterId: ids.meterA, circuitId: null, value: 5, timestamp: new Date(now - i * 15 * 60000) });
  }
  await Consumption.insertMany(rows);
  await api('GET', '/stats/dashboard-stats', tok.a);
  await api('GET', '/stats/dashboard-stats', tok.a);
  await new Promise(r => setTimeout(r, 1500)); // évaluation lancée en tâche de fond
  const Alert = require('../models/Alert');
  const alerts = await Alert.find({ userId: ids.a, dedupeKey: { $ne: null } });
  assert.ok(alerts.length >= 1, 'aucune alerte créée malgré un dépassement massif');
  const keys = alerts.map(a => a.dedupeKey);
  assert.equal(new Set(keys).size, keys.length, 'doublon de dedupeKey');
  const unread = await api('GET', '/alerts/unread-count', tok.a);
  assert.equal(unread.status, 200);
  assert.ok((unread.data.count ?? unread.data.unread ?? 0) >= 1);
});

test('préférences : SMS indisponible (désactivé nativement)', async () => {
  const g = await api('GET', '/alerts/preferences', tok.a);
  assert.equal(g.status, 200);
  assert.equal(g.data.smsAvailable, false);
  const p = await api('PATCH', '/alerts/preferences', tok.a, { email: false, inApp: true });
  assert.equal(p.status, 200);
});

test('réseau : le responsable lit son réseau, pas les sites hors réseau, et ne peut rien écrire', async () => {
  const created = await api('POST', '/networks', tok.admin, { name: 'Réseau Test', managerId: ids.mgr, siteIds: [ids.a] });
  assert.equal(created.status, 201);
  const netId = created.data._id || created.data.network?._id;
  assert.ok(netId);
  assert.equal((await api('POST', '/networks', tok.mgr, { name: 'Z', managerId: ids.mgr, siteIds: [] })).status, 403);
  assert.equal((await api('GET', `/networks/${netId}/overview`, tok.mgr)).status, 200);
  assert.equal((await api('GET', `/networks/${netId}/sites/${ids.a}/stats`, tok.mgr)).status, 200);
  const outside = await api('GET', `/networks/${netId}/sites/${ids.b}/stats`, tok.mgr);
  assert.ok([403, 404].includes(outside.status), `site hors réseau: ${outside.status}`);
  assert.equal((await api('POST', '/meters', tok.mgr, { userId: ids.a, type: 'monophase' })).status, 403);
  assert.equal((await api('PATCH', '/stats/objective', tok.mgr, { objectiveKwh: 5 })).status >= 400, true);
});
