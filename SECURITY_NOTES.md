# SECURITY_NOTES — incident et corrections appliquées

Ce document résume ce qui a été trouvé dans l'archive `WATT.zip` d'origine, ce qui a
été corrigé dans cette copie "sécurisée", et — surtout — **ce qu'il reste à faire
manuellement, côté MongoDB Atlas, et que je ne peux pas faire moi-même.**

## 1. Ce qui a fuité (critique)

Le fichier `server/.env` était présent dans l'archive livrée, donc potentiellement
committé/partagé, et contenait des secrets **réels et actifs** :

```
MONGODB_URI=mongodb+srv://watt:58587700@watt.mlabafl.mongodb.net/watt
JWT_SECRET=votre_secret_tres_securise_123
ADMIN_SECRET_KEY=GROSSO_ADMIN_2026
```

- Un identifiant/mot de passe MongoDB Atlas valide (utilisateur `watt`, cluster
  `watt.mlabafl.mongodb.net`, base `watt`).
- Un `JWT_SECRET` faible et prévisible.
- Un `ADMIN_SECRET_KEY` qui, combiné à une faille applicative (voir §2), permettait
  à n'importe qui de créer un compte administrateur via l'API publique.

**Toute personne ayant eu accès à cette archive (ou à un dépôt git contenant ce
fichier, même dans l'historique) a pu lire/écrire toute la base de données WATT.**
Il faut considérer ces identifiants comme compromis, qu'il y ait une preuve
d'exploitation ou non.

## 2. Faille applicative corrigée : contournement admin

Dans `server/controllers/authController.js`, la route publique et non authentifiée
`POST /api/auth/register` acceptait un champ `role` fourni par l'appelant :

```js
if (role === 'admin' && adminSecret !== process.env.ADMIN_SECRET_KEY) {
  return res.status(401)...
}
const user = await User.create({ name, email, password, role, ... });
```

Avec `ADMIN_SECRET_KEY` connu (il était dans le `.env` livré), n'importe qui pouvait
s'inscrire directement en tant qu'administrateur, sans jamais être authentifié au
préalable. C'est une élévation de privilèges complète.

**Corrigé dans cette copie :**
- `POST /api/auth/register` force désormais systématiquement `role: 'client'`,
  quoi que le corps de la requête contienne. Les champs `role` et `adminSecret`
  envoyés par le client sont ignorés.
- Une nouvelle route protégée `POST /api/auth/create-admin` (middleware
  `protect` + `admin`) permet à un administrateur **déjà authentifié** de créer
  d'autres comptes administrateurs.
- `ADMIN_SECRET_KEY` est retiré du flux d'inscription ; il n'est plus nécessaire.

## 3. Comportement corrigé : création automatique de comptes par défaut au démarrage

`server/index.js` exécutait, à **chaque démarrage du serveur, sans condition**
(y compris potentiellement en production) :
- création ou **réinitialisation** du mot de passe d'un compte admin
  (`admin@watt.tn` / `adminpassword123`),
- création ou réinitialisation d'un compte client (`amine@gmail.com` /
  `aminepassword123`),
- et **affichait ces mots de passe en clair dans les logs serveur**.

**Corrigé dans cette copie :**
- Ce seed ne s'exécute plus jamais si `NODE_ENV=production`.
- Il ne s'exécute plus du tout par défaut : il faut explicitement positionner
  `SEED_DEFAULT_DATA=true` dans `.env`.
- Les mots de passe ne sont plus codés en dur : ils doivent être fournis via
  `SEED_ADMIN_PASSWORD` / `SEED_CLIENT_PASSWORD` (le serveur refuse de seeder si
  absents).
- Les comptes ne sont plus **resynchronisés** (mot de passe réécrasé) à chaque
  redémarrage — uniquement créés s'ils n'existent pas encore.
- Plus aucun mot de passe n'est écrit dans les logs.
- `server/seed.js` (script manuel de reset complet de la base) applique les mêmes
  règles : refuse de s'exécuter en production, exige des mots de passe fournis par
  l'environnement.

## 4. Autres corrections mineures

- `server/.env` a été **supprimé** de cette copie livrée. Un `server/.env.example`
  (sans aucune vraie valeur) le remplace.
- Un `.gitignore` racine a été ajouté pour exclure `node_modules`, tous les
  `.env*` sauf `.env.example`, les builds et les logs.
- Le champ `category: 'B2C'` sur les paliers (`Tier`) a été retiré du code de seed :
  il n'existe pas dans le schéma Mongoose `Tier` et était silencieusement ignoré par
  MongoDB — une incohérence interne sans impact de sécurité mais qui induisait en
  erreur.

## 5. À FAIRE MANUELLEMENT — je ne peux pas le faire moi-même

Je n'ai aucun accès à votre compte MongoDB Atlas ; ces étapes sont pour vous :

1. **Rotation immédiate de l'identifiant MongoDB Atlas.** Dans Atlas →
   Database Access, changez le mot de passe de l'utilisateur `watt`, ou
   (recommandé) supprimez-le et créez un nouvel utilisateur avec un mot de passe
   fort généré aléatoirement, avec les droits minimaux nécessaires (pas
   `atlasAdmin`).
2. **Vérifiez Network Access (IP whitelist)** : si `0.0.0.0/0` est ouvert, restreignez
   aux IP qui en ont réellement besoin.
3. **Auditez les logs Atlas** (Activity Feed / Database → Logs) sur la période où ce
   fichier `.env` a pu être exposé, pour repérer des connexions ou requêtes
   inhabituelles.
4. **Vérifiez s'il existe des comptes admin inattendus** dans la collection `users`
   (`role: 'admin'`) — un signe que la faille du §2 a été exploitée avant cette
   correction.
5. **Régénérez `JWT_SECRET`** avec :
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   et placez la nouvelle valeur uniquement dans votre vrai `.env` (jamais commité).
   Cela invalide instantanément tous les tokens JWT existants (tous les
   utilisateurs devront se reconnecter — c'est voulu).
6. **Si ce code a été poussé sur un dépôt git** avec le `.env` dans l'historique,
   le simple fait de le supprimer du dernier commit ne suffit pas : l'historique
   garde la fuite. Il faut soit purger l'historique (`git filter-repo` ou
   équivalent), soit considérer le dépôt comme définitivement compromis et en
   créer un nouveau sans l'historique sensible.

Tant que l'étape 1 n'est pas faite, considérez que l'ancienne base de données
reste accessible à quiconque a eu l'archive d'origine.

## 6. Note sur les secrets suggérés dans cette session

Deux valeurs de remplacement ont été générées et affichées dans la conversation
pour illustration (`JWT_SECRET`, et un `ADMIN_SECRET_KEY` qui n'est désormais plus
utilisé). Comme elles ont transité dans une conversation, par précaution,
**ne les réutilisez pas telles quelles** : régénérez vos propres valeurs finales
localement avec la commande ci-dessus, directement dans votre `.env` réel.
