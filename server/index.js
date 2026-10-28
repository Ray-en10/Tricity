const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const PORT = process.env.PORT || 5000;

const User = require('./models/User');
const Tier = require('./models/Tier');
const Device = require('./models/Device');

// SECURITY: this used to run unconditionally on every boot (including in
// production), create/reset hardcoded admin+client credentials, and log
// those passwords to the console. It is now strictly a dev-only, opt-in
// seed helper: it never runs in production, never runs unless explicitly
// requested, never logs a password, and never re-syncs (overwrites) an
// existing account's password on every restart.
async function initDefaultData() {
  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️ initDefaultData désactivé en production.');
    return;
  }
  if (process.env.SEED_DEFAULT_DATA !== 'true') {
    console.log('ℹ️ initDefaultData désactivé (SEED_DEFAULT_DATA != "true"). Voir .env.example.');
    return;
  }

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@watt.tn';
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  const seedClientEmail = process.env.SEED_CLIENT_EMAIL || 'amine@gmail.com';
  const seedClientPassword = process.env.SEED_CLIENT_PASSWORD;

  if (!seedAdminPassword || !seedClientPassword) {
    console.warn('⚠️ SEED_DEFAULT_DATA=true mais SEED_ADMIN_PASSWORD / SEED_CLIENT_PASSWORD manquants dans .env — seed ignoré.');
    return;
  }

  try {
    // 1. Compte Administrateur de développement (créé une seule fois ; jamais resynchronisé)
    let admin = await User.findOne({ email: seedAdminEmail });
    if (!admin) {
      console.log(`⚡ Initialisation du compte Admin de développement (${seedAdminEmail})...`);
      admin = new User({
        name: 'Administrateur',
        email: seedAdminEmail,
        password: seedAdminPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Compte Admin de développement créé.');
    }

    // 2. Compte Client de développement (créé une seule fois ; jamais resynchronisé)
    let client = await User.findOne({ email: seedClientEmail });
    if (!client) {
      console.log(`⚡ Initialisation du compte Client de développement (${seedClientEmail})...`);
      client = new User({
        name: 'Amine',
        email: seedClientEmail,
        password: seedClientPassword,
        role: 'client',
        location: 'Maison Bardo',
        subscription: '6 kVA'
      });
      await client.save();
      console.log('✅ Compte Client de développement créé.');
    }

    // 3. Initialiser les Paliers s'ils sont vides (category retiré : absent du schéma Tier)
    const tierCount = await Tier.countDocuments();
    if (tierCount === 0) {
      console.log('⚡ Initialisation des Paliers STEG...');
      await Tier.insertMany([
        { min: 1, max: 100, price: 0.096, label: 'Palier 1' },
        { min: 101, max: 200, price: 0.176, label: 'Palier 2' },
        { min: 201, max: 300, price: 0.218, label: 'Palier 3' },
        { min: 301, max: 500, price: 0.341, label: 'Palier 4' },
        { min: 501, max: null, price: 0.414, label: 'Palier 5+' }
      ]);
      console.log('✅ Paliers créés.');
    }

    // 4. Initialiser des appareils pour le client s'il n'en a pas
    if (client) {
      const deviceCount = await Device.countDocuments({ userId: client._id });
      if (deviceCount === 0) {
        console.log('⚡ Initialisation des appareils pour le client...');
        await Device.insertMany([
          { userId: client._id, name: 'Climatiseur', type: 'HVAC', socketId: 'PRISE-01', avgConsumption: 1.5, status: true, icon: 'Wind' },
          { userId: client._id, name: 'Chauffe-eau', type: 'Water', socketId: 'PRISE-02', avgConsumption: 2.0, status: false, icon: 'Droplets' },
          { userId: client._id, name: 'Réfrigérateur', type: 'Appliance', socketId: 'PRISE-03', avgConsumption: 0.2, status: true, icon: 'IceCream' },
          { userId: client._id, name: 'Machine à laver', type: 'Laundry', socketId: 'PRISE-04', avgConsumption: 0.8, status: false, icon: 'WashingMachine' }
        ]);
        console.log('✅ Appareils créés.');
      }
    }
  } catch (initErr) {
    console.error('⚠️ Erreur initDefaultData:', initErr.message);
  }
}

// Évaluation périodique des seuils de notification (§8) — opt-in via
// NOTIFICATION_SCHEDULER=true (intervalle en minutes : NOTIFICATION_INTERVAL_MIN,
// 30 par défaut). Sans cela, les seuils sont évalués à chaque consultation
// du dashboard (voir statsController).
function startNotificationScheduler() {
  if (process.env.NOTIFICATION_SCHEDULER !== 'true') return;
  const { evaluateAllUsers } = require('./utils/notificationService');
  const minutes = Number(process.env.NOTIFICATION_INTERVAL_MIN || 30);
  console.log(`⏱️ Scheduler de notifications actif (toutes les ${minutes} min)`);
  setInterval(() => {
    evaluateAllUsers().catch((err) => console.error('⚠️ Scheduler notifications:', err.message));
  }, minutes * 60 * 1000);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000, // 10 seconds timeout
  connectTimeoutMS: 10000,
})
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    await initDefaultData();
    startNotificationScheduler();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error details:');
    console.error(err.message);
    if (err.message.includes('ReplicaSetNoPrimary')) {
      console.warn('👉 TIP: Check your MongoDB Atlas IP Whitelist (Network Access) and Database User credentials.');
    }
  });

const statsRoutes = require('./routes/stats');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const tierRoutes = require('./routes/tiers');
const alertRoutes = require('./routes/alerts');
const meterRoutes = require('./routes/meters');
const circuitRoutes = require('./routes/circuits');
const harmoniquesRoutes = require('./routes/harmoniques');
const networkRoutes = require('./routes/networks');

// Routes
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/tiers', tierRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/meters', meterRoutes);
app.use('/api/circuits', circuitRoutes);
app.use('/api/harmoniques', harmoniquesRoutes);
app.use('/api/networks', networkRoutes);

app.get('/', (req, res) => {
  res.send('WATT+ API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ GLOBAL ERROR:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
