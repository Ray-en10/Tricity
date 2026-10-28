const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
// Provisionnement des comptes privilégiés (installateur / admin / responsable_reseau)
// par un compte back-office déjà authentifié — voir §3/§9bis du cahier des charges.
router.post('/create-user', protect, admin, authController.createPrivilegedUser);
router.get('/users', protect, admin, authController.getUsers);

module.exports = router;
