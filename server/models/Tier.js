const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  max: { type: Number }, 
  price: { type: Number, required: true }, 
  label: { type: String, required: true },
  usageType: { type: String, enum: ['domestic', 'office', 'commercial', 'industrial'], default: 'domestic' },
  counterPower: { type: String, default: '6 kVA' }
});

module.exports = mongoose.model('Tier', tierSchema);
