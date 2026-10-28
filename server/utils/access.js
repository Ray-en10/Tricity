// Contrôle d'accès aux données d'un client (§3 du cahier des charges).
//
//   - admin (back-office) et installateur : accès à tous les clients ;
//   - client : uniquement ses propres données ;
//   - responsable_reseau : LECTURE seule des sites de ses propres réseaux
//     (§8bis) — jamais d'écriture sur un site (il supervise, il ne configure pas).

const Network = require('../models/Network');

async function canAccessUser(reqUser, targetUserId, { write = false } = {}) {
  if (reqUser.role === 'admin' || reqUser.role === 'installateur') return true;
  if (reqUser._id.toString() === targetUserId.toString()) return true;

  if (reqUser.role === 'responsable_reseau' && !write) {
    const network = await Network.exists({ managerId: reqUser._id, siteIds: targetUserId });
    return Boolean(network);
  }
  return false;
}

module.exports = { canAccessUser };
