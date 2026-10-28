const express = require('express');
const router = express.Router();
const {
  getCircuits, addCircuit, updateCircuit, deleteCircuit, getCalculatedValue, getCircuitHistory,
} = require('../controllers/circuitController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getCircuits); // ?meterId=...
router.post('/', addCircuit);
router.patch('/:id', updateCircuit);
router.delete('/:id', deleteCircuit);
router.get('/:meterId/calculated-value', getCalculatedValue);
router.get('/:id/history', getCircuitHistory); // ?granularity=hour|day|week&date=ISO

module.exports = router;
