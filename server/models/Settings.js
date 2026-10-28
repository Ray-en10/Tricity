const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  tiers: [
    {
      min: Number,
      max: Number,
      price: Number, // DT per kWh
      label: String
    }
  ],
  monthlyLimit: Number // kWh
});

module.exports = mongoose.model('Settings', settingsSchema);
