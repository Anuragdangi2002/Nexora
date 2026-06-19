const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

router.post("/signup", authController.signup);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification-otp", authController.resendVerificationOtp);
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authMiddleware, authController.getMe);
router.get("/users", authMiddleware, authController.getUsers);

module.exports = router;
