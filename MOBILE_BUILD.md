# Distribution : web, mobile monophasé, mobile triphasé

Cahier des charges §9 : le B2C dispose de **deux applications mobiles distinctes**
(compteur monophasé / triphasé), le B2B est toujours triphasé, et le responsable
réseau (multi-sites) n'a qu'une **interface web** — son application mobile se
limite à un écran de notifications qui renvoie vers le site web.

Une seule base de code, trois variantes de build pilotées par `VITE_APP_VARIANT`
(fichiers `client/.env.*`, sans aucun secret) :

| Variante | Build | Public | Comportement |
|---|---|---|---|
| `web` | `npm run build:web` | tous les rôles | Application complète. Le responsable réseau arrive sur « Mon réseau ». |
| `mobile-mono` | `npm run build:mobile-mono` | clients à compteur monophasé | Si le compteur du client est triphasé : écran « Mauvaise application ». |
| `mobile-tri` | `npm run build:mobile-tri` | clients/pros à compteur triphasé | Idem en sens inverse ; la carte Harmoniques s'affiche. |

Règles communes aux variantes mobiles :
- **Responsable réseau** : écran *notifications uniquement* + bouton « Ouvrir le
  tableau de bord réseau (web) » (`VITE_WEB_URL`).
- **Back-office / installateur** : accès complet (usage terrain).
- Un client **sans compteur installé** n'est pas bloqué (l'installateur le configure).

## Configuration

Dans chaque `client/.env.*`, remplacer `api.votre-domaine.tn` / `app.votre-domaine.tn`
par vos vrais domaines (`VITE_API_URL` pointe vers l'API `…/api`).
Plus aucune URL `localhost` n'est codée en dur dans le code : tout passe par `src/config.js`.

Côté serveur, autoriser l'origine des apps dans CORS si vous restreignez `cors()`
(actuellement ouvert, comme dans le prototype d'origine — à durcir avant production).

## Application mobile native (Capacitor)

Les apps sont empaquetées avec [Capacitor](https://capacitorjs.com) (aucune dépendance
native n'est ajoutée par défaut). Une fois, dans `client/` :

```
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

Puis, par variante :

```
npm run cap:mono     # build mobile-mono + sync (appId com.accent.tricity.mono)
npm run cap:tri      # build mobile-tri  + sync (appId com.accent.tricity.tri)
npx cap add android  # première fois seulement, puis ouvrir dans Android Studio
```

`scripts/select-capacitor-config.mjs` copie `capacitor.config.<variante>.json` vers
`capacitor.config.json` (fichier généré, ignoré par git). Chaque variante a son
propre `appId`, donc **deux applications installables côte à côte** sur un même téléphone.
Les `appId` (`com.accent.tricity.*`) sont des valeurs par défaut à adapter à votre
identité de publication (App Store / Play Store).

> Alternative sans dépendance native : chaque build produit aussi un manifest PWA
> (`manifest.mono|tri.webmanifest`) — l'app est installable depuis le navigateur.

## SMS

Le canal SMS existe dans l'application (préférence + numéro de téléphone) mais est
**désactivé nativement côté serveur** (`SMS_ENABLED=false`) : aucun envoi, aucun frais.
Dans les apps, la case SMS est grisée avec la mention « non activé ».
