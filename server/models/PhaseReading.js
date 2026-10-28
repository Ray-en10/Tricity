const mongoose = require('mongoose');

// Relevé "Harmoniques" par phase pour un compteur triphasé (§2.2, §2.3) :
// qualité du signal électrique (taux de distorsion harmonique, THD) et
// déphasage entre phases, en plus de la charge par phase.
//
// NOTE IMPORTANTE (voir le plan de remise à niveau, Phase 3.2) : le capteur
// matériel réel n'a pas encore été spécifié/intégré à ce stade. Ce modèle et
// l'endpoint associé sont prêts à recevoir de vraies valeurs dès que le
// firmware du compteur triphasé les remonte ; en attendant, ils peuvent être
// alimentés manuellement (SAV/installateur) ou rester vides (l'API renvoie
// alors un statut "en attente de données" plutôt que des chiffres inventés).
const phaseReadingSchema = new mongoose.Schema({
  meterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meter', required: true },
  timestamp: { type: Date, default: Date.now },
  phases: {
    L1: { loadKw: Number, thdPercent: Number },
    L2: { loadKw: Number, thdPercent: Number },
    L3: { loadKw: Number, thdPercent: Number },
  },
  dephasageDegrees: { type: Number }, // déphasage mesuré entre phases
}, { timestamps: true });

// Seuils de synthèse "correct" / "à corriger" (§2.3) — à valider avec
// l'équipe matériel ; valeurs de départ raisonnables pour un réseau BT.
const THD_THRESHOLD_PERCENT = 8;
const DEPHASAGE_THRESHOLD_DEGREES = 5;

phaseReadingSchema.methods.getQualityStatus = function () {
  const thdValues = ['L1', 'L2', 'L3']
    .map((p) => this.phases?.[p]?.thdPercent)
    .filter((v) => typeof v === 'number');
  if (thdValues.length === 0 && this.dephasageDegrees == null) return 'inconnu';

  const maxThd = thdValues.length ? Math.max(...thdValues) : 0;
  const dephasageOk = this.dephasageDegrees == null || Math.abs(this.dephasageDegrees) <= DEPHASAGE_THRESHOLD_DEGREES;
  const thdOk = maxThd <= THD_THRESHOLD_PERCENT;

  return (thdOk && dephasageOk) ? 'correct' : 'a_corriger';
};

module.exports = mongoose.model('PhaseReading', phaseReadingSchema);
module.exports.THD_THRESHOLD_PERCENT = THD_THRESHOLD_PERCENT;
module.exports.DEPHASAGE_THRESHOLD_DEGREES = DEPHASAGE_THRESHOLD_DEGREES;
