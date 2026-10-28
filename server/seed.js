const mongoose = require('mongoose');
const Consumption = require('./models/Consumption');
const User = require('./models/User');
const Tier = require('./models/Tier');
const Device = require('./models/Device');
const Alert = require('./models/Alert');
const Meter = require('./models/Meter');
const Circuit = require('./models/Circuit');
const { createDefaultCircuitsForMeter } = require('./controllers/circuitController');
const dotenv = require('dotenv');

dotenv.config();

// SECURITY: this script wipes the ENTIRE database and recreates hardcoded
// admin/client accounts. It must never be run against production data, and
// the account passwords must come from the environment, never be hardcoded.
if (process.env.NODE_ENV === 'production') {
  console.error('❌ seed.js refuse de s\'exécuter avec NODE_ENV=production (il efface toute la base).');
  process.exit(1);
}

const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@watt.tn';
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
const seedClientEmail = process.env.SEED_CLIENT_EMAIL || 'amine@gmail.com';
const seedClientPassword = process.env.SEED_CLIENT_PASSWORD;

if (!seedAdminPassword || !seedClientPassword) {
  console.error('❌ SEED_ADMIN_PASSWORD et SEED_CLIENT_PASSWORD doivent être définis dans .env (voir .env.example). Arrêt.');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB for seeding (dev only)...');

    // Clear existing
    await Consumption.deleteMany({});
    await User.deleteMany({});
    await Tier.deleteMany({});
    await Device.deleteMany({});
    await Alert.deleteMany({});
    await Meter.deleteMany({});
    await Circuit.deleteMany({});

    // Create Users
    const admin = await User.create({
      name: 'Administrateur',
      email: seedAdminEmail,
      password: seedAdminPassword,
      role: 'admin'
    });

    // cycleStartDate (§6.2) : ancre arbitraire de démo, le 8 du mois il y a
    // environ 20 jours, pour que "maintenant" tombe au milieu d'un cycle en
    // cours. manualObjectiveKwh : objectif de repli tant qu'aucun cycle
    // complet de 2 mois n'est disponible dans les données de démo (30 jours).
    const demoAnchor = new Date();
    demoAnchor.setDate(8);
    demoAnchor.setMonth(demoAnchor.getMonth() - (demoAnchor.getDate() > 8 ? 0 : 1));
    if (demoAnchor > new Date()) demoAnchor.setMonth(demoAnchor.getMonth() - 2);

    const client = await User.create({
      name: 'Amine',
      email: seedClientEmail,
      password: seedClientPassword,
      role: 'client',
      location: 'Maison Bardo',
      subscription: '6 kVA',
      cycleStartDate: demoAnchor,
      manualObjectiveKwh: 220
    });

    console.log('Users created.');

    // Create Tiers (category retiré : absent du schéma Tier)
    await Tier.insertMany([
      { min: 1, max: 100, price: 0.096, label: 'Palier 1' },
      { min: 101, max: 200, price: 0.176, label: 'Palier 2' },
      { min: 201, max: 300, price: 0.218, label: 'Palier 3' },
      { min: 301, max: 500, price: 0.341, label: 'Palier 4' },
      { min: 501, max: null, price: 0.414, label: 'Palier 5+' }
    ]);

    console.log('Tiers created.');

    // Create the client's meter + its 3 circuits mesurés + 1 circuit calculé
    // (§2.3, §2.4bis du cahier des charges)
    const meter = await Meter.create({ userId: client._id, type: 'monophase', index: 1, label: 'Compteur principal' });
    const circuits = await createDefaultCircuitsForMeter(meter);
    const [eclairageCircuit, prisesCircuit, climCircuit] = circuits; // order 1, 2, 3 (le 4ᵉ est calculé)

    console.log('Compteur et circuits créés.');

    // Create Devices for Client, rattachés aux circuits correspondants
    await Device.insertMany([
      { userId: client._id, circuitId: climCircuit._id, name: 'Climatiseur', type: 'HVAC', socketId: 'PRISE-01', avgConsumption: 1.5, status: true, icon: 'Wind' },
      { userId: client._id, circuitId: prisesCircuit._id, name: 'Chauffe-eau', type: 'Water', socketId: 'PRISE-02', avgConsumption: 2.0, status: false, icon: 'Droplets' },
      { userId: client._id, circuitId: prisesCircuit._id, name: 'Réfrigérateur', type: 'Appliance', socketId: 'PRISE-03', avgConsumption: 0.2, status: true, icon: 'IceCream' },
      { userId: client._id, circuitId: prisesCircuit._id, name: 'Machine à laver', type: 'Laundry', socketId: 'PRISE-04', avgConsumption: 0.8, status: false, icon: 'WashingMachine' }
    ]);

    console.log('Devices created.');

    // Create Alerts for Client
    await Alert.insertMany([
      { userId: client._id, title: 'Risque de dépassement', message: 'Vous risquez de dépasser le palier 2 ce mois-ci.', type: 'warning' },
      { userId: client._id, title: 'Consommation inhabituelle', message: 'Une forte consommation a été détectée entre 18h et 20h.', type: 'danger' },
      { userId: client._id, title: 'Objectif atteint', message: 'Bravo ! Vous avez atteint votre objectif de réduction.', type: 'success' }
    ]);

    console.log('Alerts created.');

    // Create Consumption Data for Client : une mesure "Général" (circuitId
    // null, meterId du compteur) + une mesure par circuit mesuré, pour
    // permettre le calcul du circuit déduit (§2.3) et les historiques (§4.2).
    const data = [];
    const now = new Date();
    const measuredCircuits = [eclairageCircuit, prisesCircuit, climCircuit];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      for (let h = 0; h < 24; h++) {
        const hourDate = new Date(date);
        hourDate.setHours(h);

        const circuitValues = measuredCircuits.map(() => Math.random() * 0.8 + 0.1);
        const generalValue = circuitValues.reduce((a, b) => a + b, 0) + (Math.random() * 0.5 + 0.1); // + part non affectée (circuit calculé)

        data.push({
          userId: client._id, timestamp: hourDate, value: generalValue,
          deviceId: 'main', meterId: meter._id, circuitId: null
        });
        measuredCircuits.forEach((circuit, idx) => {
          data.push({
            userId: client._id, timestamp: hourDate, value: circuitValues[idx],
            deviceId: 'main', meterId: meter._id, circuitId: circuit._id
          });
        });
      }
    }

    await Consumption.insertMany(data);
    console.log('Consumption data created.');
    
    console.log('Seeding Phase 2 complete!');
    process.exit();
  })
  .catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
