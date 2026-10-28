const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard-stats', protect, statsController.getDashboardStats);
router.patch('/objective', protect, statsController.setManualObjective);

module.exports = router;
