// Projection de fin de cycle STEG (§6.4) : à partir du rythme de
// consommation observé depuis le début du cycle, extrapole le total
// prévisionnel en fin de cycle et détermine si le client est en avance ou
// en retard par rapport à son objectif.

const { getCycleProgress } = require('./stegCycle');

// deltaPercent : écart signé entre le cumul réel et le cumul attendu au
// prorata du cycle écoulé (positif = consomme plus que prévu à ce stade).
function projectCycleEnd({ cumulSoFar, objectiveKwh, cycleStart, cycleEnd, now = new Date() }) {
  const { prorata, daysElapsed, totalDays } = getCycleProgress(cycleStart, cycleEnd, now);

  const expectedSoFar = objectiveKwh != null ? objectiveKwh * prorata : null;
  const deltaPercent = expectedSoFar && expectedSoFar > 0
    ? ((cumulSoFar - expectedSoFar) / expectedSoFar) * 100
    : null;

  // Extrapolation linéaire simple du rythme observé sur le reste du cycle.
  const estimatedTotal = prorata > 0.02 ? cumulSoFar / prorata : cumulSoFar;

  let status = 'on_track';
  if (objectiveKwh != null) {
    if (estimatedTotal > objectiveKwh * 1.02) status = 'retard'; // en retard = va dépasser l'objectif
    else if (estimatedTotal < objectiveKwh * 0.98) status = 'avance'; // en avance = marge sous l'objectif
  }

  return {
    daysElapsed: Math.round(daysElapsed * 10) / 10,
    totalDays: Math.round(totalDays * 10) / 10,
    prorataPercent: Math.round(prorata * 1000) / 10,
    expectedSoFarKwh: expectedSoFar != null ? Math.round(expectedSoFar * 100) / 100 : null,
    deltaPercent: deltaPercent != null ? Math.round(deltaPercent * 10) / 10 : null,
    estimatedTotalKwh: Math.round(estimatedTotal * 100) / 100,
    status, // 'avance' | 'retard' | 'on_track'
  };
}

module.exports = { projectCycleEnd };
