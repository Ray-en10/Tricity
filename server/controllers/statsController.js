const { computeUserStats } = require('../utils/statsService');
const { evaluateUserThresholds } = require('../utils/notificationService');

// GET /api/stats/dashboard-stats — indicateurs du client connecté (§4.1, §6).
// Le calcul vit dans utils/statsService.js (réutilisé par le dashboard réseau
// et par l'évaluation des seuils de notification).
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await computeUserStats(req.user);

    // Évaluation des seuils en tâche de fond (§8) : ne bloque ni ne fait
    // échouer la réponse si l'envoi de notification pose problème.
    evaluateUserThresholds(req.user, stats).catch((err) =>
      console.error('⚠️ Évaluation des seuils de notification:', err.message)
    );

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Permet au client de saisir/ajuster manuellement son objectif (§6.2, §6.3)
// — utilisé tant qu'aucun historique complet n'est disponible, ou pour un
// ajustement volontaire (ex. objectif plus strict).
exports.setManualObjective = async (req, res) => {
  try {
    const { objectiveKwh } = req.body;
    if (typeof objectiveKwh !== 'number' || objectiveKwh <= 0) {
      return res.status(400).json({ message: 'objectiveKwh doit être un nombre positif' });
    }
    req.user.manualObjectiveKwh = objectiveKwh;
    await req.user.save();
    res.json({ manualObjectiveKwh: req.user.manualObjectiveKwh });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
