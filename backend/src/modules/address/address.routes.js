const express = require('express');
const router = express.Router();
const addressController = require('./address.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  validateAddAddress,
  validateUpdateAddress,
} = require('./address.validation');

// Enforce authentication across all Address endpoints
router.use(authenticate);

/**
 * @route   POST /api/addresses
 * @desc    Add a new saved address for the authenticated user
 * @access  Private
 */
router.post('/', validateAddAddress, (req, res) => addressController.addAddress(req, res));

/**
 * @route   GET /api/addresses
 * @desc    Retrieve all active saved addresses belonging to authenticated user
 * @access  Private
 */
router.get('/', (req, res) => addressController.getUserAddresses(req, res));

/**
 * @route   GET /api/addresses/:addressId
 * @desc    Retrieve a single address by ID (requires ownership)
 * @access  Private
 */
router.get('/:addressId', (req, res) => addressController.getAddressById(req, res));

/**
 * @route   PUT /api/addresses/:addressId
 * @desc    Update an existing address (requires ownership)
 * @access  Private
 */
router.put('/:addressId', validateUpdateAddress, (req, res) => addressController.updateAddress(req, res));

/**
 * @route   DELETE /api/addresses/:addressId
 * @desc    Soft-delete / deactivate an address (requires ownership)
 * @access  Private
 */
router.delete('/:addressId', (req, res) => addressController.deactivateAddress(req, res));

/**
 * @route   PATCH /api/addresses/:addressId/default
 * @desc    Set address as the default address for the user (requires ownership)
 * @access  Private
 */
router.patch('/:addressId/default', (req, res) => addressController.setDefaultAddress(req, res));

module.exports = router;
