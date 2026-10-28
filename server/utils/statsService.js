// Calcul des indicateurs "journée en cours" et "cycle STEG" pour un client
// donné (§4.1, §6). Extrait du contrôleur en Phase 5 pour être réutilisé par
// (1) l'API client, (2) le dashboard multi-sites du responsable réseau
// (§8bis) et (3) l'évaluation des seuils de notification (§8).

const Consumption = require('../models/Consumption');
const Meter = require('../models/Meter');
const { getCurrentCycleBounds } = require('./stegCycle');
const { computeCycleObjective } = require('./objectiveEngine');
const { projectCycleEnd } = require('./cycleProjection');
const { getStatusColor } = require('./statusColor');

async function getSum(userId, start, end) {
  const agg = await Consumption.aggregate([
    { $match: { userId: userId.toString(), timestamp: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$value' } } },
  ]);
  return agg[0]?.total || 0;
}

async function computeUserStats(user, now = new Date()) {
  // --- Cycle STEG en cours (§6.2, §6.4) ---
  const { start: cycleStart, end: cycleEnd } = getCurrentCycleBounds(user, now);
  const cumulCycleKwh = await getSum(user._id, cycleStart, cycleEnd);

  const objective = await computeCycleObjective(user, now);
  const objectiveKwh = objective.objectiveKwh;

  const projection = objectiveKwh != null
    ? projectCycleEnd({ cumulSoFar: cumulCycleKwh, objectiveKwh, cycleStart, cycleEnd, now })
    : null;

  const cycleColor = getStatusColor(projection?.deltaPercent ?? null);
  const cycleCostDT = objective.currentTierPrice != null
    ? Math.round(cumulCycleKwh * objective.currentTierPrice * 1000) / 1000
    : null;

  // --- Journée en cours (§4.1) ---
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const totalTodayKwh = await getSum(user._id, startOfDay, endOfDay);

  const totalCycleDays = (cycleEnd.getTime() - cycleStart.getTime()) / 86400000;
  const dailyObjectiveKwh = objectiveKwh != null && totalCycleDays > 0
    ? Math.round((objectiveKwh / totalCycleDays) * 100) / 100
    : null;
  const dayDeltaPercent = dailyObjectiveKwh
    ? Math.round(((totalTodayKwh - dailyObjectiveKwh) / dailyObjectiveKwh) * 1000) / 10
    : null;
  const dayColor = getStatusColor(dayDeltaPercent);

  // --- Type de compteur (§2.1) ---
  const primaryMeter = await Meter.findOne({ userId: user._id, index: 1 });

  return {
    meterId: primaryMeter?._id || null,
    meterType: primaryMeter?.type || null,
    day: {
      totalKwh: Math.round(totalTodayKwh * 100) / 100,
      objectiveKwh: dailyObjectiveKwh,
      deltaPercent: dayDeltaPercent,
      color: dayColor,
    },
    cycle: {
      start: cycleStart,
      end: cycleEnd,
      cumulKwh: Math.round(cumulCycleKwh * 100) / 100,
      objectiveKwh,
      objectiveSource: objective.source,
      currentTierLabel: objective.currentTierLabel || null,
      currentTierPrice: objective.currentTierPrice || null,
      cumulDT: cycleCostDT,
      deltaPercent: projection?.deltaPercent ?? null,
      color: cycleColor,
      projection,
    },
  };
}

module.exports = { computeUserStats };
