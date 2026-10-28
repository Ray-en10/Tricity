const mongoose = require('mongoose');

// Un compteur STEG installé chez un client (§2.1, §2.4 du cahier des charges).
// Un client a 1 compteur en standard, au maximum 2 (index 1 ou 2) pour les
// grands domiciles/villas nécessitant jusqu'à 8 circuits au total (§2.4bis).
const meterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['monophase', 'triphase'], required: true },
  index: { type: Number, enum: [1, 2], default: 1 },
  label: { type: String, default: 'Compteur principal' },
}, { timestamps: true });

meterSchema.index({ userId: 1, index: 1 }, { unique: true });

module.exports = mongoose.model('Meter', meterSchema);
