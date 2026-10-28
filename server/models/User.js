const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  // 4 rôles du cahier des charges Tricity (§3, §9bis) :
  //   client            -> client final (B2C ou B2B local)
  //   installateur      -> installateur/technicien
  //   admin             -> back-office ACCENT (nom technique conservé pour compatibilité)
  //   responsable_reseau -> responsable réseau B2B multi-sites (interface web uniquement)
  role: { type: String, enum: ['client', 'installateur', 'admin', 'responsable_reseau'], default: 'client' },
  location: { type: String, default: 'Maison Bardo' },
  subscription: { type: String, default: '6 kVA' }, // Puissance Compteur
  usageType: { type: String, enum: ['domestic', 'office', 'commercial', 'industrial'], default: 'domestic' },
  // Ajout Phase 2 (§6.2) : date de début du cycle de facturation bimestriel
  // STEG, propre à chaque client (ex. toujours le 8 de chaque période).
  // Stockée comme une date ancre ; seul le jour du mois est réutilisé pour
  // déterminer le début de chaque cycle de 2 mois.
  cycleStartDate: { type: Date, default: null },
  // Objectif saisi manuellement par l'utilisateur (§6.2) — utilisé tant
  // qu'aucun cycle complet d'historique n'est disponible pour calculer un
  // objectif automatique, et ajustable ensuite librement par le client.
  manualObjectiveKwh: { type: Number, default: null },
  // Ajout Phase 4 (§8) : canaux de notification choisis par chaque
  // utilisateur. Le canal SMS existe au niveau applicatif (préférence
  // enregistrée) mais est NATIVEMENT DÉSACTIVÉ côté serveur tant que
  // SMS_ENABLED n'est pas "true" (voir utils/notificationService.js) afin
  // d'éviter des frais d'envoi non voulus.
  notificationPrefs: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  // Numéro pour le canal SMS (inutilisé tant que SMS_ENABLED != true).
  phone: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
