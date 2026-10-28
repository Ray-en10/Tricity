const mongoose = require('mongoose');

// Un circuit/disjoncteur rattaché à un compteur (§2.3, §2.4bis, §4.2).
// Schéma standard par compteur : 3 circuits mesurés (order 1-3, nommés par
// défaut Éclairage/Prises/Climatisation pour un domicile B2C, librement
// renommables par l'installateur) + 1 circuit calculé (order 4, isCalculated
// = true) représentant Général − (circuit1 + circuit2 + circuit3), sans
// capteur physique dédié. Avec 2 compteurs (Meter.index 1 et 2), un domicile
// peut ainsi atteindre 8 circuits au total.
const circuitSchema = new mongoose.Schema({
  meterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meter', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // dénormalisé pour les contrôles d'accès rapides
  name: { type: String, required: true },
  order: { type: Number, required: true, min: 1, max: 4 },
  isCalculated: { type: Boolean, default: false },
  objectiveKwh: { type: Number, default: null }, // objectif propre au circuit (§4.2)
}, { timestamps: true });

circuitSchema.index({ meterId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Circuit', circuitSchema);
