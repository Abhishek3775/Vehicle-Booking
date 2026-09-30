const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  validateRequestOtp,
  validateVerifyOtp,
  validateRefreshToken,
  validateLogout,
  validateLogin,
} = require('./auth.validation');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user using Email and Password
 * @access  Public
 */
router.post('/login', validateLogin, (req, res) => authController.login(req, res));

/**
 * @route   POST /api/auth/request-otp & POST /api/auth/send-otp
 * @desc    Request a 6-digit OTP for phone number authentication
 * @access  Public
 */
router.post('/request-otp', validateRequestOtp, (req, res) => authController.requestOtp(req, res));
router.post('/send-otp', validateRequestOtp, (req, res) => authController.requestOtp(req, res));

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

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated account details
 * @access  Private (Bearer Token)
 */
router.get('/me', authenticate, (req, res) => authController.getMe(req, res));

module.exports = router;

