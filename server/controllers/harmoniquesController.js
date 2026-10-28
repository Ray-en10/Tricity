const Meter = require('../models/Meter');
const { canAccessUser } = require('../utils/access');
const PhaseReading = require('../models/PhaseReading');

// Carte "Harmoniques" (§2.3) — qualité du signal + déphasage entre phases,
// avec badge de synthèse correct/à corriger. Uniquement pertinent pour un
// compteur triphasé (§2.1) ; renvoie 404 pour un compteur monophasé.
exports.getLatestHarmoniques = async (req, res) => {
  try {
    const meter = await Meter.findById(req.params.meterId);
    if (!meter) return res.status(404).json({ message: 'Compteur non trouvé' });
    if (!(await canAccessUser(req.user, meter.userId))) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (meter.type !== 'triphase') {
      return res.status(404).json({ message: "L'indicateur Harmoniques ne s'applique qu'aux compteurs triphasés" });
    }

    const latest = await PhaseReading.findOne({ meterId: meter._id }).sort({ timestamp: -1 });
    if (!latest) {
      // Pas de valeur inventée : on indique clairement l'absence de donnée
      // capteur plutôt que d'afficher un chiffre fictif (voir modèle PhaseReading).
      return res.json({ meterId: meter._id, available: false, status: 'en_attente_donnees' });
    }

    res.json({
      meterId: meter._id,
      available: true,
      timestamp: latest.timestamp,
      phases: latest.phases,
      dephasageDegrees: latest.dephasageDegrees,
      status: latest.getQualityStatus(), // 'correct' | 'a_corriger' | 'inconnu'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Enregistrement d'un relevé — en attendant l'intégration firmware du
// capteur réel, réservé à l'installateur/back-office (ex. saisie SAV) ou à
// un futur job d'ingestion matérielle utilisant le même contrat d'API.
exports.addReading = async (req, res) => {
  try {
    if (!['admin', 'installateur'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seul un installateur ou le back-office peut enregistrer un relevé Harmoniques' });
    }
    const meter = await Meter.findById(req.params.meterId);
    if (!meter) return res.status(404).json({ message: 'Compteur non trouvé' });
    if (meter.type !== 'triphase') {
      return res.status(400).json({ message: 'Les relevés Harmoniques ne concernent que les compteurs triphasés' });
    }

    const { phases, dephasageDegrees } = req.body;
    const reading = await PhaseReading.create({ meterId: meter._id, phases, dephasageDegrees });
    res.status(201).json({ ...reading.toObject(), status: reading.getQualityStatus() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
