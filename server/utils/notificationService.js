// Service de notification multi-canal (§8 du cahier des charges).
//
// Canaux :
//   - inApp : crée une Alert (badge de non-lus côté UI) — toujours disponible.
//   - email : envoi SMTP via nodemailer si SMTP_HOST est configuré ; sinon
//             le canal est simplement ignoré (aucune erreur).
//   - sms   : présent au niveau applicatif (préférence utilisateur, champ
//             téléphone) mais NATIVEMENT DÉSACTIVÉ : aucun envoi, aucun
//             appel à un opérateur, tant que SMS_ENABLED n'est pas "true".
//             Décision produit : éviter des frais d'envoi par défaut.
//
// Chaque utilisateur choisit ses canaux (User.notificationPrefs).

const Alert = require('../models/Alert');
const User = require('../models/User');

// --- SMS : désactivé par défaut -------------------------------------------
function isSmsEnabled() {
  return process.env.SMS_ENABLED === 'true';
}

async function sendSms(/* user, text */) {
  // Point d'extension unique pour brancher un opérateur/passerelle SMS le
  // jour où le canal sera activé. Volontairement non implémenté : activer
  // SMS_ENABLED sans fournir d'implémentation n'envoie rien et le signale.
  throw new Error("Canal SMS activé (SMS_ENABLED=true) mais aucun fournisseur n'est implémenté dans sendSms()");
}

// --- E-mail ---------------------------------------------------------------
let transporter = null;
let mailerInitialized = false;

function getTransporter() {
  if (mailerInitialized) return transporter;
  mailerInitialized = true;
  if (!process.env.SMTP_HOST) return null;
  try {
    // eslint-disable-next-line global-require
    const nodemailer = require('nodemailer');
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } catch (err) {
    console.warn('⚠️ nodemailer indisponible (npm install requis) — canal e-mail ignoré:', err.message);
    transporter = null;
  }
  return transporter;
}

async function sendEmail(user, { title, message }) {
  const tx = getTransporter();
  if (!tx) return false;
  await tx.sendMail({
    from: process.env.MAIL_FROM || 'Tricity <no-reply@tricity.local>',
    to: user.email,
    subject: `[Tricity] ${title}`,
    text: `${message}\n\n— Tricity / WATT+`,
    html: `<p>${message}</p><p style="color:#888">— Tricity / WATT+</p>`,
  });
  return true;
}

// --- Orchestration --------------------------------------------------------
function getPrefs(user) {
  const p = user.notificationPrefs || {};
  return {
    inApp: p.inApp !== false,
    email: p.email !== false,
    sms: p.sms === true,
  };
}

// Envoie une notification selon les préférences de l'utilisateur.
// Renvoie l'Alert créée, ou null si l'alerte (même dedupeKey) existe déjà.
async function notify(user, { title, message, type = 'info', dedupeKey = null, siteId = null }) {
  if (dedupeKey) {
    const existing = await Alert.findOne({ userId: user._id, dedupeKey });
    if (existing) return null;
  }

  const prefs = getPrefs(user);
  const channels = [];

  // L'Alert est toujours enregistrée (historique + dédoublonnage). Si
  // l'utilisateur a désactivé le canal in-app, elle est créée déjà lue pour
  // ne pas alimenter le badge de non-lus.
  if (prefs.inApp) channels.push('inApp');

  if (prefs.email) {
    try {
      if (await sendEmail(user, { title, message })) channels.push('email');
    } catch (err) {
      console.error(`⚠️ Échec envoi e-mail à ${user.email}:`, err.message);
    }
  }

  if (prefs.sms && isSmsEnabled() && user.phone) {
    try {
      await sendSms(user, `${title} — ${message}`);
      channels.push('sms');
    } catch (err) {
      console.error('⚠️ Canal SMS:', err.message);
    }
  }

  try {
    return await Alert.create({
      userId: user._id,
      title,
      message,
      type,
      dedupeKey,
      siteId,
      channels,
      isRead: !prefs.inApp,
    });
  } catch (err) {
    // Course entre deux évaluations simultanées : l'index unique a déjà
    // enregistré la même alerte — rien à faire.
    if (err.code === 11000) return null;
    throw err;
  }
}

// --- Déclencheurs de seuil (§8) -------------------------------------------
const COLOR_LABEL = { jaune: 'critique', orange: 'très critique', rouge: 'objectif dépassé' };
const COLOR_TYPE = { jaune: 'warning', orange: 'warning', rouge: 'danger' };

function ymd(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// Évalue les indicateurs d'un client (résultat de computeUserStats) et envoie
// une notification dès qu'un seuil jaune/orange/rouge est franchi, ou si la
// projection fin de cycle indique un retard. Dédoublonné par jour / cycle.
// Sur dépassement rouge du cycle, le(s) responsable(s) réseau dont le client
// est un site sont aussi notifiés (§8bis : alertes ciblées sur sites défaillants).
async function evaluateUserThresholds(user, stats, now = new Date()) {
  const created = [];

  const dayColor = stats.day?.color;
  if (dayColor && dayColor !== 'vert') {
    const a = await notify(user, {
      title: `Journée en cours : ${COLOR_LABEL[dayColor]}`,
      message: `Vous avez consommé ${stats.day.totalKwh} kWh aujourd'hui pour un objectif journalier de ${stats.day.objectiveKwh} kWh (${stats.day.deltaPercent > 0 ? '+' : ''}${stats.day.deltaPercent}%).`,
      type: COLOR_TYPE[dayColor],
      dedupeKey: `day:${ymd(now)}:${dayColor}`,
    });
    if (a) created.push(a);
  }

  const cycleColor = stats.cycle?.color;
  const cycleKey = stats.cycle?.start ? ymd(stats.cycle.start) : 'na';
  if (cycleColor && cycleColor !== 'vert') {
    const a = await notify(user, {
      title: `Cycle STEG : ${COLOR_LABEL[cycleColor]}`,
      message: `Votre cumul (${stats.cycle.cumulKwh} kWh) est à ${stats.cycle.deltaPercent > 0 ? '+' : ''}${stats.cycle.deltaPercent}% de l'attendu au prorata du cycle.`,
      type: COLOR_TYPE[cycleColor],
      dedupeKey: `cycle:${cycleKey}:${cycleColor}`,
    });
    if (a) created.push(a);

    if (cycleColor === 'rouge') {
      created.push(...await notifyNetworkManagers(user, stats, cycleKey));
    }
  }

  if (stats.cycle?.projection?.status === 'retard') {
    const a = await notify(user, {
      title: 'Risque de dépassement de palier',
      message: `À ce rythme, vous atteindrez ${stats.cycle.projection.estimatedTotalKwh} kWh en fin de cycle pour un objectif de ${stats.cycle.objectiveKwh} kWh. Réduisez votre consommation pour rester dans le palier.`,
      type: 'warning',
      dedupeKey: `cycle:${cycleKey}:retard`,
    });
    if (a) created.push(a);
  }

  return created;
}

async function notifyNetworkManagers(site, stats, cycleKey) {
  // Chargement tardif : le modèle Network n'est utile que pour le multi-sites.
  // eslint-disable-next-line global-require
  const Network = require('../models/Network');
  const networks = await Network.find({ siteIds: site._id });
  const out = [];
  for (const network of networks) {
    // eslint-disable-next-line no-await-in-loop
    const manager = await User.findById(network.managerId);
    if (!manager) continue;
    // eslint-disable-next-line no-await-in-loop
    const a = await notify(manager, {
      title: `Site en dépassement : ${site.location || site.name}`,
      message: `Le site « ${site.location || site.name} » (${network.name}) dépasse son objectif de cycle (${stats.cycle.deltaPercent > 0 ? '+' : ''}${stats.cycle.deltaPercent}% vs attendu).`,
      type: 'danger',
      dedupeKey: `site:${site._id}:cycle:${cycleKey}:rouge`,
      siteId: site._id,
    });
    if (a) out.push(a);
  }
  return out;
}

// Évaluation périodique de tous les clients (scheduler opt-in, voir index.js).
async function evaluateAllUsers() {
  // eslint-disable-next-line global-require
  const { computeUserStats } = require('./statsService');
  const users = await User.find({ role: 'client' });
  for (const user of users) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const stats = await computeUserStats(user);
      // eslint-disable-next-line no-await-in-loop
      await evaluateUserThresholds(user, stats);
    } catch (err) {
      console.error(`⚠️ Évaluation des seuils pour ${user.email}:`, err.message);
    }
  }
}

module.exports = { notify, evaluateUserThresholds, evaluateAllUsers, isSmsEnabled, getPrefs };
