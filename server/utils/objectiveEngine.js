// Calcul de l'objectif de consommation du cycle STEG en cours (§6.2, §6.3).
// Principe : moyenne de la consommation réelle des cycles bimestriels
// précédents, ajustée pour viser le palier tarifaire le plus avantageux
// atteignable sans fixer une cible théorique déconnectée de l'usage réel
// constaté. Sans historique complet, l'objectif saisi manuellement par
// l'utilisateur (User.manualObjectiveKwh) fait foi.

const Consumption = require('../models/Consumption');
const Tier = require('../models/Tier');
const { getPreviousCycles } = require('./stegCycle');

async function getCumulForPeriod(userId, start, end) {
  const agg = await Consumption.aggregate([
    { $match: { userId: userId.toString(), timestamp: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$value' } } },
  ]);
  return agg[0]?.total || 0;
}

// Paliers applicables à ce client, filtrés par type d'usage et puissance
// souscrite (§6.3 — repris du modèle de filtrage WATT, désormais formalisé
// dans le cahier des charges §6.3).
async function getApplicableTiers(user) {
  return Tier.find({
    usageType: user.usageType || 'domestic',
    counterPower: user.subscription || '6 kVA',
  }).sort({ min: 1 });
}

async function computeCycleObjective(user, now = new Date()) {
  const previousCycles = getPreviousCycles(user, now, 6);
  const cumuls = [];
  for (const cycle of previousCycles) {
    // eslint-disable-next-line no-await-in-loop
    const total = await getCumulForPeriod(user._id, cycle.start, cycle.end);
    if (total > 0) cumuls.push(total);
  }

  if (cumuls.length === 0) {
    // Nouvelle installation, pas de cycle complet disponible : saisie manuelle (§6.2).
    return {
      source: 'manual',
      objectiveKwh: user.manualObjectiveKwh ?? null,
      cyclesUsed: 0,
    };
  }

  const historicalAverage = cumuls.reduce((a, b) => a + b, 0) / cumuls.length;
  const tiers = await getApplicableTiers(user);

  const currentTier = tiers.find(
    (t) => historicalAverage >= t.min && (t.max == null || historicalAverage <= t.max)
  );

  let objectiveKwh = historicalAverage;
  if (currentTier) {
    const currentIndex = tiers.findIndex((t) => t._id.equals(currentTier._id));
    const lowerTier = currentIndex > 0 ? tiers[currentIndex - 1] : null;
    // Si l'usage réel est raisonnablement proche (< 15%) du haut du palier
    // inférieur, on vise ce palier plus avantageux ; sinon on garde la
    // moyenne historique comme objectif réaliste (§6.2 : rester réalisable).
    if (lowerTier && lowerTier.max != null && historicalAverage - lowerTier.max < lowerTier.max * 0.15) {
      objectiveKwh = lowerTier.max;
    }
  }

  return {
    source: 'historical',
    objectiveKwh: Math.round(objectiveKwh * 100) / 100,
    historicalAverageKwh: Math.round(historicalAverage * 100) / 100,
    cyclesUsed: cumuls.length,
    currentTierLabel: currentTier ? currentTier.label : null,
    currentTierPrice: currentTier ? currentTier.price : null,
  };
}

module.exports = { getCumulForPeriod, getApplicableTiers, computeCycleObjective };
