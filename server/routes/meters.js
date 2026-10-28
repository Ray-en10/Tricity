const express = require('express');
const router = express.Router();
const { getMeters, addMeter, getMeter, deleteMeter } = require('../controllers/meterController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getMeters);
router.post('/', addMeter);
router.get('/:id', getMeter);
router.delete('/:id', deleteMeter);

module.exports = router;
