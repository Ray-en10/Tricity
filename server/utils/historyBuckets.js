// Génère les tranches temporelles ("buckets") pour le drill-down historique
// par clic (§4.2) : jour → heure, semaine → jour, mois → semaine.

function pad(n) { return String(n).padStart(2, '0'); }

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function getBuckets(granularity, referenceDate = new Date()) {
  const ref = new Date(referenceDate);

  if (granularity === 'hour') {
    // Vue "jour" : 24 tranches d'une heure.
    const dayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const buckets = [];
    for (let h = 0; h < 24; h++) {
      const start = new Date(dayStart.getTime() + h * 3600000);
      const end = new Date(start.getTime() + 3600000);
      buckets.push({ start, end, label: `${pad(h)}h` });
    }
    return buckets;
  }

  if (granularity === 'day') {
    // Vue "semaine" : 7 tranches d'un jour (lundi à dimanche).
    const dow = ref.getDay(); // 0 = dimanche
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const weekStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + mondayOffset);
    const buckets = [];
    for (let d = 0; d < 7; d++) {
      const start = new Date(weekStart.getTime() + d * 86400000);
      const end = new Date(start.getTime() + 86400000);
      buckets.push({ start, end, label: DAY_LABELS[start.getDay()] });
    }
    return buckets;
  }

  if (granularity === 'week') {
    // Vue "mois" : tranches de 7 jours depuis le 1er du mois (4 à 5 tranches).
    const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    const buckets = [];
    let start = monthStart;
    let i = 1;
    while (start < monthEnd) {
      const end = new Date(Math.min(start.getTime() + 7 * 86400000, monthEnd.getTime()));
      buckets.push({ start: new Date(start), end, label: `Sem. ${i}` });
      start = end;
      i++;
    }
    return buckets;
  }

  throw new Error(`Granularité inconnue : ${granularity}`);
}

module.exports = { getBuckets };
