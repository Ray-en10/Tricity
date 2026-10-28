const Alert = require('../models/Alert');
const { isSmsEnabled, getPrefs } = require('../utils/notificationService');

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id }).sort({ timestamp: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Compteur de notifications non lues, affiché en badge sur l'icône (§8).
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Alert.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markOneAsRead = async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alerte non trouvée' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Alert.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'Toutes les alertes marquées comme lues' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Préférences de canaux de notification (§8) : chaque utilisateur choisit
// les canaux qu'il souhaite. `smsAvailable` indique si le canal SMS est
// réellement activé côté serveur (désactivé nativement, voir
// utils/notificationService.js) afin que l'UI puisse le griser.
exports.getPreferences = async (req, res) => {
  res.json({
    prefs: getPrefs(req.user),
    phone: req.user.phone || '',
    smsAvailable: isSmsEnabled(),
  });
};

exports.updatePreferences = async (req, res) => {
  try {
    const { inApp, email, sms, phone } = req.body;
    const current = getPrefs(req.user);
    req.user.notificationPrefs = {
      inApp: typeof inApp === 'boolean' ? inApp : current.inApp,
      email: typeof email === 'boolean' ? email : current.email,
      sms: typeof sms === 'boolean' ? sms : current.sms,
    };
    if (typeof phone === 'string') req.user.phone = phone.trim() || null;
    await req.user.save();
    res.json({
      prefs: getPrefs(req.user),
      phone: req.user.phone || '',
      smsAvailable: isSmsEnabled(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
