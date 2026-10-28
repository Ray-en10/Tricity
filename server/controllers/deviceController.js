const Device = require('../models/Device');
const Circuit = require('../models/Circuit');

// Rôles pouvant agir sur les appareils de n'importe quel client (back-office
// et installateur, qui configure les équipements lors de l'intervention —
// §3 du cahier des charges). Un client final ne voit/modifie que les siens.
const isPrivileged = (role) => role === 'admin' || role === 'installateur';

exports.getDevices = async (req, res) => {
  try {
    const filter = isPrivileged(req.user.role) ? {} : { userId: req.user._id };
    if (req.query.circuitId) filter.circuitId = req.query.circuitId;
    const devices = await Device.find(filter).populate('userId', 'name location');
    res.json(devices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addDevice = async (req, res) => {
  try {
    const userId = (isPrivileged(req.user.role) && req.body.userId) ? req.body.userId : req.user._id;

    // Si un circuit est précisé, il doit appartenir au même client (§2.3/§7.3).
    if (req.body.circuitId) {
      const circuit = await Circuit.findById(req.body.circuitId);
      if (!circuit) return res.status(404).json({ message: 'Circuit non trouvé' });
      if (circuit.userId.toString() !== userId.toString()) {
        return res.status(400).json({ message: 'Ce circuit n\'appartient pas à ce client' });
      }
      if (circuit.isCalculated) {
        return res.status(400).json({ message: 'Impossible de rattacher un équipement au circuit calculé' });
      }
    }

    const device = await Device.create({ ...req.body, userId });
    res.status(201).json(device);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleDevice = async (req, res) => {
  try {
    console.log(`🔌 Tentative de basculement pour l'appareil: ${req.params.id}`);
    const device = await Device.findById(req.params.id);
    if (!device) {
        console.warn('❓ Appareil non trouvé');
        return res.status(404).json({ message: 'Appareil non trouvé' });
    }
    
    console.log(`👤 Demandé par: ${req.user.email} (Rôle: ${req.user.role})`);
    
    // Check permission
    if (!isPrivileged(req.user.role) && device.userId.toString() !== req.user._id.toString()) {
      console.warn('🚫 Accès non autorisé pour cet utilisateur');
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id, 
      { status: !device.status }, 
      { new: true }
    );
    console.log(`✅ Nouveau statut: ${updatedDevice.status ? 'ON' : 'OFF'}`);
    res.json(updatedDevice);
  } catch (err) {
    console.error('💥 Erreur lors du basculement:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Appareil non trouvé' });

    // Check permission
    if (!isPrivileged(req.user.role) && device.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const updatedDevice = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedDevice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Appareil non trouvé' });

    // Check permission
    if (!isPrivileged(req.user.role) && device.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await Device.findByIdAndDelete(req.params.id);
    res.json({ message: 'Appareil supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
