const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Ajout Phase 1 (§2.3, §7.3) : rattachement au circuit/disjoncteur sous
  // lequel l'équipement est raccordé. Optionnel pour compatibilité avec les
  // appareils existants non encore affectés à un circuit.
  circuitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circuit', default: null },
  name: { type: String, required: true },
  type: { type: String, required: true }, 
  avgConsumption: { type: Number, default: 0 }, 
  status: { type: Boolean, default: true }, 
  icon: { type: String, default: 'Smartphone' },
  socketId: { type: String, default: () => 'PRISE-' + Math.floor(1000 + Math.random() * 9000) },
  brand: { type: String },
  power: { type: Number }, // Puissance en Watts
  serialNumber: { type: String },
  notes: { type: String }
});

module.exports = mongoose.model('Device', deviceSchema);
