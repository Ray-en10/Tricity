const express = require('express');
const router = express.Router();
const {
  getAlerts, markAsRead, markOneAsRead, getUnreadCount, getPreferences, updatePreferences,
} = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getAlerts);
router.get('/unread-count', getUnreadCount);
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);
router.post('/read-all', markAsRead);
router.patch('/:id/read', markOneAsRead);

module.exports = router;
