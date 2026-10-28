// Utilitaires du cycle de facturation STEG bimestriel (§6.2 du cahier des
// charges). La STEG facture tous les 2 mois, avec une date de début propre
// à chaque client (ex. toujours le 8, ou toujours le 25 de chaque période).
// Toute la logique de cumul/objectif/projection doit utiliser ces bornes de
// cycle plutôt qu'un mois calendaire.

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

// Renvoie les bornes [start, end) du cycle bimestriel contenant `now`,
// calées sur l'ancre `user.cycleStartDate` (son jour du mois fait foi).
// Si l'utilisateur n'a pas encore d'ancre (nouvelle installation sans
// date STEG connue), on retombe sur le 1er du mois courant à titre
// provisoire — l'installateur doit idéalement renseigner cycleStartDate
// dès la souscription.
function getCurrentCycleBounds(user, now = new Date()) {
  const anchor = user?.cycleStartDate
    ? new Date(user.cycleStartDate)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  anchor.setHours(0, 0, 0, 0);

  let start = new Date(anchor);
  // Aligne `start` sur le cycle de 2 mois qui contient `now`, en avançant ou
  // en reculant par pas de 2 mois (note : en cas d'ancre le 29/30/31, un
  // comportement de débordement de mois JS standard peut légèrement décaler
  // certains cycles — acceptable pour un cahier des charges V1).
  while (addMonths(start, 2) <= now) start = addMonths(start, 2);
  while (start > now) start = addMonths(start, -2);

  const end = addMonths(start, 2);
  return { start, end };
}

// Renvoie les `count` cycles bimestriels complets précédant le cycle en
// cours (le plus récent en premier) — base du calcul de l'objectif par
// historique (§6.2).
function getPreviousCycles(user, now = new Date(), count = 6) {
  const { start: currentStart } = getCurrentCycleBounds(user, now);
  const cycles = [];
  let end = currentStart;
  for (let i = 0; i < count; i++) {
    const start = addMonths(end, -2);
    cycles.push({ start, end });
    end = start;
  }
  return cycles;
}

// Progression au sein du cycle courant, utilisée pour le prorata attendu
// (§6.4) : part du cycle déjà écoulée, entre 0 et 1.
function getCycleProgress(start, end, now = new Date()) {
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.min(Math.max(now.getTime() - start.getTime(), 0), totalMs);
  return {
    totalDays: totalMs / 86400000,
    daysElapsed: elapsedMs / 86400000,
    prorata: totalMs > 0 ? elapsedMs / totalMs : 0,
  };
}

module.exports = { addMonths, getCurrentCycleBounds, getPreviousCycles, getCycleProgress };
