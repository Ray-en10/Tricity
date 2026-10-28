const Meter = require('../models/Meter');
const { canAccessUser } = require('../utils/access');
const Circuit = require('../models/Circuit');
const { createDefaultCircuitsForMeter } = require('./circuitController');

exports.getMeters = async (req, res) => {
  try {
    let filter;
    if (req.user.role === 'admin' || req.user.role === 'installateur') {
      filter = req.query.userId ? { userId: req.query.userId } : {};
    } else if (req.query.userId && req.query.userId !== req.user._id.toString()) {
      // Ex. responsable réseau consultant un de ses sites (lecture seule, §8bis).
      if (!(await canAccessUser(req.user, req.query.userId))) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      filter = { userId: req.query.userId };
    } else {
      filter = { userId: req.user._id };
    }
    const meters = await Meter.find(filter).populate('userId', 'name location');
    res.json(meters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Création d'un compteur (§2.1, §2.4) — réservée à l'installateur/back-office.
// Crée automatiquement les 3 circuits mesurés + le circuit calculé (§2.4bis).
// Refuse un 2ᵉ compteur (index 2) si le client n'en a pas encore 1 (§2.4 :
// maximum 2 compteurs par site).
exports.addMeter = async (req, res) => {
  try {
    if (!['admin', 'installateur'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seul un installateur ou le back-office peut créer un compteur' });
    }
    const { userId, type, index, label } = req.body;
    if (!userId || !type) {
      return res.status(400).json({ message: 'userId et type (monophase/triphase) requis' });
    }

    const existingCount = await Meter.countDocuments({ userId });
    if (existingCount >= 2) {
      return res.status(400).json({ message: 'Maximum 2 compteurs par client (§2.4 du cahier des charges)' });
    }

    const meter = await Meter.create({
      userId,
      type,
      index: index || existingCount + 1,
      label: label || (existingCount === 0 ? 'Compteur principal' : 'Compteur secondaire'),
    });

    const circuits = await createDefaultCircuitsForMeter(meter);
    res.status(201).json({ meter, circuits });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMeter = async (req, res) => {
  try {
    const meter = await Meter.findById(req.params.id);
    if (!meter) return res.status(404).json({ message: 'Compteur non trouvé' });
    if (!(await canAccessUser(req.user, meter.userId))) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    const circuits = await Circuit.find({ meterId: meter._id }).sort({ order: 1 });
    res.json({ meter, circuits });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteMeter = async (req, res) => {
  try {
    if (!['admin', 'installateur'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seul un installateur ou le back-office peut supprimer un compteur' });
    }
    const meter = await Meter.findById(req.params.id);
    if (!meter) return res.status(404).json({ message: 'Compteur non trouvé' });

    await Circuit.deleteMany({ meterId: meter._id });
    await Meter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Compteur et ses circuits supprimés avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
