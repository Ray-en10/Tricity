const express = require('express');
const router = express.Router();
const { getTiers, updateTier, addTier, deleteTier } = require('../controllers/tierController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getTiers);
router.post('/', protect, admin, addTier);
router.patch('/:id', protect, admin, updateTier);
router.delete('/:id', protect, admin, deleteTier);

module.exports = router;
