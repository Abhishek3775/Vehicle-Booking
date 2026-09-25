const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  validateUpdateProfile,
  validateUpdateProfileImage,
} = require('./user.validation');

// Enforce authentication across all User routes
router.use(authenticate);

/**
 * @route   GET /api/users/profile
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/profile', (req, res) => userController.getProfile(req, res));

/**
 * @route   PUT /api/users/profile
 * @desc    Update current authenticated user profile
 * @access  Private
 */
router.put('/profile', validateUpdateProfile, (req, res) => userController.updateProfile(req, res));

/**
 * @route   DELETE /api/users/account
 * @desc    Safely deactivate current authenticated user account
 * @access  Private
 */
router.delete('/account', (req, res) => userController.deactivateAccount(req, res));

/**
 * @route   PUT /api/users/profile-image
 * @desc    Update profile image URL for current authenticated user
 * @access  Private
 */
router.put('/profile-image', validateUpdateProfileImage, (req, res) => userController.updateProfileImage(req, res));

module.exports = router;
