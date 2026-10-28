const mongoose = require('mongoose');

// Réseau multi-sites B2B (§8bis du cahier des charges) : un responsable
// réseau (rôle `responsable_reseau`) supervise plusieurs sites équipés,
// chaque site étant un compte client (User) avec son propre compteur et son
// propre dashboard indépendant.
const networkSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ex. « Réseau agences Tunis »
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  siteIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

networkSchema.index({ managerId: 1 });
networkSchema.index({ siteIds: 1 });

module.exports = mongoose.model('Network', networkSchema);
