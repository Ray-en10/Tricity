const express = require('express');
const router = express.Router();
const { getLatestHarmoniques, addReading } = require('../controllers/harmoniquesController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/:meterId', getLatestHarmoniques);
router.post('/:meterId', addReading);

module.exports = router;
