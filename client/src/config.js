// Configuration d'exécution du client (Phase 5 — variantes de distribution).
//
// Trois variantes de build, pilotées par VITE_APP_VARIANT (voir .env.* et
// MOBILE_BUILD.md) :
//   - web          : application web complète (tous rôles)
//   - mobile-mono  : application mobile B2C pour compteurs MONOPHASÉS
//   - mobile-tri   : application mobile B2C/B2B pour compteurs TRIPHASÉS
// (cahier des charges §9 : deux apps mobiles B2C distinctes ; B2B toujours triphasé ;
// responsable réseau = web uniquement, avec un écran de notifications côté mobile.)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5008/api';
export const WEB_APP_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:5173';
export const APP_VARIANT = import.meta.env.VITE_APP_VARIANT || 'web';
export const IS_MOBILE = APP_VARIANT.startsWith('mobile');

// Type de compteur servi par la variante mobile (null = pas de restriction).
export const VARIANT_METER_TYPE = {
  'mobile-mono': 'monophase',
  'mobile-tri': 'triphase',
}[APP_VARIANT] || null;

export const VARIANT_LABEL = {
  web: 'Tricity Web',
  'mobile-mono': 'Tricity Monophasé',
  'mobile-tri': 'Tricity Triphasé',
}[APP_VARIANT] || 'Tricity';
