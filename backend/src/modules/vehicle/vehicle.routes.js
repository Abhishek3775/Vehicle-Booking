const express = require('express');
const router = express.Router();
const vehicleController = require('./vehicle.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  validateAddVehicle,
  validateUpdateVehicle,
} = require('./vehicle.validation');

// Enforce authentication across all Vehicle endpoints
router.use(authenticate);

/**
 * @route   POST /api/vehicles
 * @desc    Add a new vehicle for the authenticated user
 * @access  Private
 */
router.post('/', validateAddVehicle, (req, res) => vehicleController.addVehicle(req, res));

/**
 * @route   GET /api/vehicles
 * @desc    Retrieve all active vehicles belonging to authenticated user
 * @access  Private
 */
router.get('/', (req, res) => vehicleController.getUserVehicles(req, res));

/**
 * @route   GET /api/vehicles/:vehicleId
 * @desc    Retrieve a single vehicle by ID (requires ownership)
 * @access  Private
 */
router.get('/:vehicleId', (req, res) => vehicleController.getVehicleById(req, res));

/**
 * @route   PUT /api/vehicles/:vehicleId
 * @desc    Update an existing vehicle (requires ownership)
 * @access  Private
 */
router.put('/:vehicleId', validateUpdateVehicle, (req, res) => vehicleController.updateVehicle(req, res));

/**
 * @route   DELETE /api/vehicles/:vehicleId
 * @desc    Soft-delete / deactivate a vehicle (requires ownership)
 * @access  Private
 */
router.delete('/:vehicleId', (req, res) => vehicleController.deactivateVehicle(req, res));

/**
 * @route   PATCH /api/vehicles/:vehicleId/default
 * @desc    Set vehicle as the default vehicle for the user (requires ownership)
 * @access  Private
 */
router.patch('/:vehicleId/default', (req, res) => vehicleController.setDefaultVehicle(req, res));

module.exports = router;
