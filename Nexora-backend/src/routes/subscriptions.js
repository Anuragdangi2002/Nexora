const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

// Public routes
router.get("/plans", subscriptionController.getPlans);

// Authenticated user routes
router.post("/subscribe", authMiddleware, subscriptionController.subscribe);
router.post("/cancel", authMiddleware, subscriptionController.cancelSubscription);

// Admin-only routes
router.get("/admin/plans", authMiddleware, adminMiddleware, subscriptionController.getAdminPlans);
router.post("/plans", authMiddleware, adminMiddleware, subscriptionController.createPlan);
router.put("/plans/:id", authMiddleware, adminMiddleware, subscriptionController.updatePlan);
router.delete("/plans/:id", authMiddleware, adminMiddleware, subscriptionController.deletePlan);

module.exports = router;
