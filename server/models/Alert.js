const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['warning', 'info', 'danger', 'success'], default: 'info' },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  // Ajout Phase 4 (§8) -------------------------------------------------
  // Site concerné (utile pour le responsable réseau : "notifications ciblées
  // sur les sites défaillants", §8bis). Par défaut = le propriétaire de l'alerte.
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Clé de dédoublonnage (ex. "cycle:2026-10-07:rouge") : évite de renvoyer
  // la même alerte à chaque évaluation des seuils.
  dedupeKey: { type: String, default: null },
  // Canaux réellement utilisés pour cette alerte (traçabilité).
  channels: { type: [String], default: ['inApp'] },
});

alertSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });
alertSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Alert', alertSchema);
