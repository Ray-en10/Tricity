const express = require('express');
const router = express.Router();
const {
  createNetwork, updateNetwork, deleteNetwork, listNetworks, getOverview, getSiteStats,
} = require('../controllers/networkController');
const { protect, admin, requireRole } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', requireRole('admin', 'responsable_reseau'), listNetworks);
router.post('/', admin, createNetwork);
router.patch('/:id', admin, updateNetwork);
router.delete('/:id', admin, deleteNetwork);
router.get('/:id/overview', requireRole('admin', 'responsable_reseau'), getOverview);
router.get('/:id/sites/:siteId/stats', requireRole('admin', 'responsable_reseau'), getSiteStats);

module.exports = router;
