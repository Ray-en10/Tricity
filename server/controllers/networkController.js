const Network = require('../models/Network');
const User = require('../models/User');
const Alert = require('../models/Alert');
const { computeUserStats } = require('../utils/statsService');
const { getStatusColor } = require('../utils/statusColor');

// Un réseau n'est visible que de son responsable (lecture) et du back-office
// (gestion complète) — §3, §8bis.
async function loadNetworkForUser(req, res) {
  const network = await Network.findById(req.params.id);
  if (!network) {
    res.status(404).json({ message: 'Réseau non trouvé' });
    return null;
  }
  const isManager = network.managerId.toString() === req.user._id.toString();
  if (req.user.role !== 'admin' && !isManager) {
    res.status(403).json({ message: 'Accès non autorisé' });
    return null;
  }
  return network;
}

// --- Gestion (back-office uniquement) -------------------------------------
exports.createNetwork = async (req, res) => {
  try {
    const { name, managerId, siteIds = [] } = req.body;
    if (!name || !managerId) return res.status(400).json({ message: 'name et managerId requis' });

    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'responsable_reseau') {
      return res.status(400).json({ message: "managerId doit référencer un compte de rôle 'responsable_reseau'" });
    }
    const sites = await User.find({ _id: { $in: siteIds }, role: 'client' }).select('_id');
    const network = await Network.create({ name, managerId, siteIds: sites.map((s) => s._id) });
    res.status(201).json(network);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateNetwork = async (req, res) => {
  try {
    const network = await Network.findById(req.params.id);
    if (!network) return res.status(404).json({ message: 'Réseau non trouvé' });

    if (typeof req.body.name === 'string') network.name = req.body.name;
    if (Array.isArray(req.body.siteIds)) {
      const sites = await User.find({ _id: { $in: req.body.siteIds }, role: 'client' }).select('_id');
      network.siteIds = sites.map((s) => s._id);
    }
    await network.save();
    res.json(network);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteNetwork = async (req, res) => {
  try {
    await Network.findByIdAndDelete(req.params.id);
    res.json({ message: 'Réseau supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Consultation ---------------------------------------------------------
exports.listNetworks = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { managerId: req.user._id };
    const networks = await Network.find(filter).populate('siteIds', 'name location');
    res.json(networks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Dashboard global du réseau (§8bis) : vue d'ensemble de tous les sites,
// agrégation des objectifs, sites défaillants mis en avant.
exports.getOverview = async (req, res) => {
  try {
    const network = await loadNetworkForUser(req, res);
    if (!network) return;

    const sites = await User.find({ _id: { $in: network.siteIds } });
    const summaries = await Promise.all(sites.map(async (site) => {
      const stats = await computeUserStats(site);
      return {
        siteId: site._id,
        name: site.name,
        location: site.location,
        meterType: stats.meterType,
        day: stats.day,
        cycle: {
          cumulKwh: stats.cycle.cumulKwh,
          cumulDT: stats.cycle.cumulDT,
          objectiveKwh: stats.cycle.objectiveKwh,
          deltaPercent: stats.cycle.deltaPercent,
          color: stats.cycle.color,
          projectionStatus: stats.cycle.projection?.status || null,
          expectedSoFarKwh: stats.cycle.projection?.expectedSoFarKwh ?? null,
          estimatedTotalKwh: stats.cycle.projection?.estimatedTotalKwh ?? null,
        },
      };
    }));

    // Agrégats réseau.
    const totalCumul = summaries.reduce((a, s) => a + s.cycle.cumulKwh, 0);
    const totalExpected = summaries.reduce((a, s) => a + (s.cycle.expectedSoFarKwh || 0), 0);
    const totalObjective = summaries.reduce((a, s) => a + (s.cycle.objectiveKwh || 0), 0);
    const totalDT = summaries.reduce((a, s) => a + (s.cycle.cumulDT || 0), 0);
    const networkDelta = totalExpected > 0
      ? Math.round(((totalCumul - totalExpected) / totalExpected) * 1000) / 10
      : null;

    // Sites défaillants = cycle en rouge ou projection en retard.
    const failing = summaries
      .filter((s) => s.cycle.color === 'rouge' || s.cycle.projectionStatus === 'retard')
      .sort((a, b) => (b.cycle.deltaPercent ?? 0) - (a.cycle.deltaPercent ?? 0));

    const unreadAlerts = await Alert.countDocuments({ userId: req.user._id, isRead: false });

    res.json({
      network: { _id: network._id, name: network.name },
      totals: {
        sites: summaries.length,
        sitesFailing: failing.length,
        sitesOk: summaries.length - failing.length,
        cumulKwh: Math.round(totalCumul * 100) / 100,
        objectiveKwh: Math.round(totalObjective * 100) / 100,
        cumulDT: Math.round(totalDT * 1000) / 1000,
        deltaPercent: networkDelta,
        color: getStatusColor(networkDelta),
      },
      sites: summaries,
      failingSiteIds: failing.map((s) => s.siteId),
      unreadAlerts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Dashboard indépendant d'un site du réseau (§8bis) — mêmes indicateurs
// qu'un site B2B individuel.
exports.getSiteStats = async (req, res) => {
  try {
    const network = await loadNetworkForUser(req, res);
    if (!network) return;
    const isMember = network.siteIds.some((id) => id.toString() === req.params.siteId);
    if (!isMember) return res.status(404).json({ message: 'Site non membre de ce réseau' });

    const site = await User.findById(req.params.siteId);
    if (!site) return res.status(404).json({ message: 'Site non trouvé' });
    const stats = await computeUserStats(site);
    res.json({ site: { _id: site._id, name: site.name, location: site.location }, ...stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
