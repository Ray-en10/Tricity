const Tier = require('../models/Tier');

exports.getTiers = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
        filter = { 
            usageType: req.user.usageType || 'domestic', 
            counterPower: req.user.subscription || '6 kVA' 
        };
    }
    const tiers = await Tier.find(filter).sort({ usageType: 1, counterPower: 1, min: 1 });
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTier = async (req, res) => {
  try {
    const tier = await Tier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(tier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addTier = async (req, res) => {
    try {
      const tier = await Tier.create(req.body);
      res.status(201).json(tier);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
};

exports.deleteTier = async (req, res) => {
    try {
        await Tier.findByIdAndDelete(req.params.id);
        res.json({ message: 'Palier supprimé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
