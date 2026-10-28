const mongoose = require('mongoose');

const consumptionSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  value: { type: Number, required: true }, // in kW
  deviceId: { type: String, default: 'main' },
  userId: { type: String, required: true },
  // Ajout Phase 1 (§2.3, §4.2) : rattachement optionnel à un circuit mesuré,
  // nécessaire pour l'historique par disjoncteur (jour/semaine/mois) et pour
  // calculer le circuit déduit (Général − somme des 3 circuits mesurés).
  // Reste optionnel pour ne pas casser les anciennes séries sans circuit.
  circuitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circuit', default: null },
  meterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meter', default: null }
});

module.exports = mongoose.model('Consumption', consumptionSchema);
