const express = require('express');
const router = express.Router();
const { getDevices, addDevice, toggleDevice, updateDevice, deleteDevice } = require('../controllers/deviceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getDevices);
router.post('/', addDevice);
router.patch('/:id/toggle', toggleDevice);
router.patch('/:id', updateDevice);
router.delete('/:id', deleteDevice);

module.exports = router;
