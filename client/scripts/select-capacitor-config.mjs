// Copie capacitor.config.<variante>.json vers capacitor.config.json avant
// `npx cap sync` (Capacitor lit un seul fichier de config).
// Usage : node scripts/select-capacitor-config.mjs mono|tri
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const variant = process.argv[2];
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, `capacitor.config.${variant}.json`);
if (!['mono', 'tri'].includes(variant) || !existsSync(src)) {
  console.error('Usage : node scripts/select-capacitor-config.mjs mono|tri');
  process.exit(1);
}
copyFileSync(src, join(root, 'capacitor.config.json'));
console.log(`capacitor.config.json <- capacitor.config.${variant}.json`);
