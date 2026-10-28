// Seuils de couleur (§4.1, §6.1 du cahier des charges) — miroir de
// server/utils/statusColor.js, appliqué côté frontend aux valeurs déjà
// calculées par l'API (deltaPercent). `deltaPercent` = (réel - objectif) /
// objectif * 100 : négatif si en dessous de l'objectif, positif si dépassé.
export function getStatusColor(deltaPercent) {
  if (deltaPercent === null || deltaPercent === undefined || Number.isNaN(deltaPercent)) return null;
  if (deltaPercent <= -10) return 'vert';
  if (deltaPercent <= -5) return 'jaune';
  if (deltaPercent <= 0) return 'orange';
  return 'rouge';
}

// Code couleur -> couleur CSS réelle (cohérent avec la charte Tricity).
export const COLOR_HEX = {
  vert: '#3CCF4E',
  jaune: '#F2C94C',
  orange: '#FF9F29',
  rouge: '#EB5757',
};

export function formatDeltaPercent(deltaPercent) {
  if (deltaPercent === null || deltaPercent === undefined) return '—';
  const sign = deltaPercent > 0 ? '+' : '';
  return `${sign}${deltaPercent.toFixed(1)}%`;
}
