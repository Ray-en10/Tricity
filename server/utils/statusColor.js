// Seuils de couleur (§4.1, §6.1 du cahier des charges), appliqués à tout
// écart signé par rapport à un objectif (jour ou cycle) :
//   >= 10% sous l'objectif  -> vert
//   5% à 10% sous l'objectif -> jaune
//   0% à 5% sous l'objectif  -> orange
//   objectif dépassé         -> rouge
// `deltaPercent` = (valeur réelle - objectif) / objectif * 100 : négatif si
// en dessous de l'objectif, positif si l'objectif est dépassé.
function getStatusColor(deltaPercent) {
  if (deltaPercent == null || Number.isNaN(deltaPercent)) return null;
  if (deltaPercent <= -10) return 'vert';
  if (deltaPercent <= -5) return 'jaune';
  if (deltaPercent <= 0) return 'orange';
  return 'rouge';
}

module.exports = { getStatusColor };
