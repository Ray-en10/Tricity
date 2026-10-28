const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
  // SECURITY: role is NEVER taken from the request body. Every public
  // self-registration is forced to 'client'. Admin accounts can only be
  // created by an already-authenticated admin via POST /api/auth/create-admin.
  const { name, email, password, location, subscription, usageType } = req.body;
  console.log(`📝 Tentative d'inscription pour: ${email}`);

  try {
    if (mongoose.connection.readyState !== 1) {
        console.error('❌ Erreur: Base de données non connectée');
        return res.status(503).json({ message: 'La base de données est hors ligne.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      console.warn(`⚠️ Échec inscription: L'utilisateur ${email} existe déjà`);
      return res.status(400).json({ message: 'L\'utilisateur existe déjà' });
    }

    const user = await User.create({ name, email, password, role: 'client', location, subscription, usageType });
    console.log(`✅ Utilisateur créé avec succès: ${email} (ID: ${user._id})`);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      subscription: user.subscription,
      usageType: user.usageType,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error('💥 Erreur fatale lors de l\'inscription:', err);
    res.status(500).json({ message: err.message });
  }
};

// SECURITY: replaces the old public adminSecret bypass. Only an
// already-authenticated back-office account (protect + admin middleware on
// the route) may create a privileged account. Per §3/§9bis of the cahier
// des charges, the back-office provisions installateur, admin (back-office)
// and responsable_reseau accounts — a client can only ever self-register as
// 'client' (see exports.register above).
const PRIVILEGED_ROLES = ['installateur', 'admin', 'responsable_reseau'];

exports.createPrivilegedUser = async (req, res) => {
  const { name, email, password, role, location, subscription, usageType } = req.body;

  if (!PRIVILEGED_ROLES.includes(role)) {
    return res.status(400).json({ message: `Rôle invalide. Attendu l'un de : ${PRIVILEGED_ROLES.join(', ')}` });
  }

  console.log(`📝 Création d'un compte "${role}" par ${req.user.email} pour: ${email}`);

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'La base de données est hors ligne.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'L\'utilisateur existe déjà' });
    }

    const user = await User.create({ name, email, password, role, location, subscription, usageType });
    console.log(`✅ Compte "${role}" créé: ${email} (ID: ${user._id})`);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error('💥 Erreur lors de la création de compte privilégié:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  let { email, password } = req.body;
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'La base de données est hors ligne. Vérifiez votre connexion MongoDB.' });
    }
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log(`🔑 Tentative de connexion pour : "${cleanEmail}"`);

    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } 
    });

    if (!user) {
      console.warn(`❌ Connexion échouée : utilisateur non trouvé pour "${cleanEmail}"`);
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn(`❌ Connexion échouée : mot de passe incorrect pour "${cleanEmail}"`);
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    console.log(`✅ Connexion réussie pour : ${user.email} (rôle: ${user.role})`);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      subscription: user.subscription,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'client' }).select('name email location');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
