const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");
const { authMiddleware, optionalAuthMiddleware } = require("../middleware/auth");

// Public browsing routes (optional authentication)
router.get("/homepage", optionalAuthMiddleware, movieController.getHomepageMovies);
router.get("/:id", optionalAuthMiddleware, movieController.getMovieById);

// Authenticated user movie actions
router.post("/my-list", authMiddleware, movieController.addToMyList);
router.delete("/my-list/:id", authMiddleware, movieController.removeFromMyList);
router.post("/continue-watching", authMiddleware, movieController.updateContinueWatching);

module.exports = router;

