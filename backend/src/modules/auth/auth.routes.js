const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const {
  validateRequestOtp,
  validateVerifyOtp,
  validateRefreshToken,
  validateLogout,
} = require('./auth.validation');

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request a 6-digit OTP for phone number authentication
 * @access  Public
 */
router.post('/request-otp', validateRequestOtp, (req, res) => authController.requestOtp(req, res));

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and obtain JWT access & refresh tokens
 * @access  Public
 */
router.post('/verify-otp', validateVerifyOtp, (req, res) => authController.verifyOtp(req, res));

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Obtain a new access token using a valid refresh token
 * @access  Public
 */
router.post('/refresh-token', validateRefreshToken, (req, res) => authController.refreshToken(req, res));

/**
 * @route   POST /api/auth/logout
 * @desc    Invalidate refresh token and end active session
 * @access  Public (Optional Bearer Token / Refresh Token)
 */
router.post('/logout', validateLogout, (req, res) => authController.logout(req, res));

module.exports = router;
