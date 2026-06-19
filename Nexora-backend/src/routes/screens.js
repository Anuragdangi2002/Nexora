const express = require("express");
const router = express.Router();
const screenController = require("../controllers/screenController");
const authMiddleware = require("../middleware/auth");

router.post("/start", authMiddleware, screenController.startStream);
router.post("/heartbeat", authMiddleware, screenController.heartbeat);
router.post("/stop", authMiddleware, screenController.stopStream);
router.get("/active", authMiddleware, screenController.getActiveScreens);

module.exports = router;
