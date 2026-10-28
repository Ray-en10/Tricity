const Circuit = require('../models/Circuit');
const Meter = require('../models/Meter');
const { canAccessUser } = require('../utils/access');
const Consumption = require('../models/Consumption');
const User = require('../models/User');
const { getBuckets } = require('../utils/historyBuckets');
const { getCurrentCycleBounds } = require('../utils/stegCycle');
const { getStatusColor } = require('../utils/statusColor');

// Noms par défaut pour les 3 circuits mesurés d'un domicile B2C monophasé
// (§2.4bis) — l'installateur peut les renommer librement ensuite.
const DEFAULT_CIRCUIT_NAMES = ['Éclairage', 'Prises', 'Climatisation'];
const CALCULATED_CIRCUIT_NAME = 'Autres (calculé)';

// Crée automatiquement les 3 circuits mesurés + le circuit calculé pour un
// compteur donné (appelé à la création du Meter). Utilisé par meterController.
async function createDefaultCircuitsForMeter(meter) {
  const circuits = DEFAULT_CIRCUIT_NAMES.map((name, i) => ({
    meterId: meter._id,
    userId: meter.userId,
    name,
    order: i + 1,
    isCalculated: false,
  }));
  circuits.push({
    meterId: meter._id,
    userId: meter.userId,
    name: CALCULATED_CIRCUIT_NAME,
    order: 4,
    isCalculated: true,
  });
  return Circuit.insertMany(circuits);
}

exports.createDefaultCircuitsForMeter = createDefaultCircuitsForMeter;

exports.getCircuits = async (req, res) => {
  try {
    const filter = { meterId: req.query.meterId };
    if (!filter.meterId) return res.status(400).json({ message: 'meterId requis' });

    const meter = await Meter.findById(filter.meterId);
    if (!meter) return res.status(404).json({ message: 'Compteur non trouvé' });
    if (!(await canAccessUser(req.user, meter.userId))) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const circuits = await Circuit.find(filter).sort({ order: 1 });
    res.json(circuits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Ajout d'un circuit supplémentaire (ex. 4ᵉ circuit mesuré optionnel, ou
// circuit libre sur un 2ᵉ compteur de villa) — réservé à l'installateur/admin,
// qui peut le nommer librement (§2.4bis).
exports.addCircuit = async (req, res) => {
  try {
    if (!['admin', 'installateur'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seul un installateur ou le back-office peut ajouter un circuit' });
    }
    const { meterId, name, order } = req.body;
    const meter = await Meter.findById(meterId);
    if (!meter) return res.status(404).json({ message: 'Compteur non trouvé' });

    const existingCount = await Circuit.countDocuments({ meterId });
    if (existingCount >= 4) {
      return res.status(400).json({ message: 'Ce compteur a déjà atteint son maximum de 4 circuits (voir §2.4bis)' });
    }

    const circuit = await Circuit.create({
      meterId,
      userId: meter.userId,
      name: name || `Circuit ${existingCount + 1}`,
      order: order || existingCount + 1,
      isCalculated: false,
    });
    res.status(201).json(circuit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Renommage libre par l'installateur et/ou mise à jour de l'objectif du circuit.
exports.updateCircuit = async (req, res) => {
  try {
    const circuit = await Circuit.findById(req.params.id);
    if (!circuit) return res.status(404).json({ message: 'Circuit non trouvé' });
    // write:true -> un responsable réseau (lecture seule) ne peut pas modifier un circuit de site.
    if (!(await canAccessUser(req.user, circuit.userId, { write: true }))) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (circuit.isCalculated && req.body.name) {
      return res.status(400).json({ message: 'Le circuit calculé ne peut pas être renommé' });
    }

    const updated = await Circuit.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, objectiveKwh: req.body.objectiveKwh },
      { new: true, omitUndefined: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Calcul du circuit déduit (§2.3) : Général − (circuit1 + circuit2 + circuit3),
// sans capteur physique dédié. Convention de mesure : les relevés `Consumption`
// avec meterId défini et circuitId=null représentent le Général du compteur ;
// les relevés avec circuitId défini représentent un des circuits mesurés.
async function computeCalculatedCircuitValue(meterId, start, end) {
  const [generalAgg, measuredAgg] = await Promise.all([
    Consumption.aggregate([
      { $match: { meterId, circuitId: null, timestamp: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]),
    Consumption.aggregate([
      { $match: { meterId, circuitId: { $ne: null }, timestamp: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]),
  ]);
  const general = generalAgg[0]?.total || 0;
  const measured = measuredAgg[0]?.total || 0;
  return Math.max(0, general - measured);
}

exports.computeCalculatedCircuitValue = computeCalculatedCircuitValue;

// Endpoint de consultation directe de la valeur déduite sur une période donnée.
exports.getCalculatedValue = async (req, res) => {
  try {
    const { meterId } = req.params;
    const { start, end } = req.query;
    const meter = await Meter.findById(meterId);
    if (!meter) return res.status(404).json({ message: 'Compteur non trouvé' });
    if (!(await canAccessUser(req.user, meter.userId))) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    const startDate = start ? new Date(start) : new Date(new Date().setHours(0, 0, 0, 0));
    const endDate = end ? new Date(end) : new Date();
    const value = await computeCalculatedCircuitValue(meterId, startDate, endDate);
    res.json({ meterId, start: startDate, end: endDate, value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Historique par clic (§4.2) : jour → heure, semaine → jour, mois → semaine,
// coloré selon le prorata de l'objectif du circuit pour la période affichée
// (l'objectif cycle du circuit est réparti proportionnellement à la durée de
// chaque tranche). ?granularity=hour|day|week&date=ISO (date de référence,
// défaut: maintenant).
exports.getCircuitHistory = async (req, res) => {
  try {
    const circuit = await Circuit.findById(req.params.id);
    if (!circuit) return res.status(404).json({ message: 'Circuit non trouvé' });
    if (!(await canAccessUser(req.user, circuit.userId))) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const granularity = req.query.granularity || 'hour';
    const referenceDate = req.query.date ? new Date(req.query.date) : new Date();
    const buckets = getBuckets(granularity, referenceDate);

    const owner = await User.findById(circuit.userId);
    const { start: cycleStart, end: cycleEnd } = getCurrentCycleBounds(owner, referenceDate);
    const cycleDurationMs = cycleEnd.getTime() - cycleStart.getTime();

    const results = await Promise.all(buckets.map(async (bucket) => {
      let value;
      if (circuit.isCalculated) {
        value = await computeCalculatedCircuitValue(circuit.meterId, bucket.start, bucket.end);
      } else {
        const agg = await Consumption.aggregate([
          { $match: { circuitId: circuit._id, timestamp: { $gte: bucket.start, $lt: bucket.end } } },
          { $group: { _id: null, total: { $sum: '$value' } } },
        ]);
        value = agg[0]?.total || 0;
      }

      const bucketDurationMs = bucket.end.getTime() - bucket.start.getTime();
      const bucketObjective = circuit.objectiveKwh != null && cycleDurationMs > 0
        ? (circuit.objectiveKwh / cycleDurationMs) * bucketDurationMs
        : null;
      const deltaPercent = bucketObjective
        ? Math.round(((value - bucketObjective) / bucketObjective) * 1000) / 10
        : null;

      return {
        label: bucket.label,
        start: bucket.start,
        end: bucket.end,
        valueKwh: Math.round(value * 1000) / 1000,
        objectiveKwh: bucketObjective != null ? Math.round(bucketObjective * 1000) / 1000 : null,
        deltaPercent,
        color: getStatusColor(deltaPercent),
      };
    }));

    res.json({ circuitId: circuit._id, granularity, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCircuit = async (req, res) => {
  try {
    if (!['admin', 'installateur'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seul un installateur ou le back-office peut supprimer un circuit' });
    }
    const circuit = await Circuit.findById(req.params.id);
    if (!circuit) return res.status(404).json({ message: 'Circuit non trouvé' });
    if (circuit.isCalculated) {
      return res.status(400).json({ message: 'Le circuit calculé ne peut pas être supprimé' });
    }
    await Circuit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Circuit supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
