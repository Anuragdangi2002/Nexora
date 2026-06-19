const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");
const authMiddleware = require("../middleware/auth");

// Secure all movie routes with authMiddleware
router.get("/homepage", authMiddleware, movieController.getHomepageMovies);
router.post("/my-list", authMiddleware, movieController.addToMyList);
router.delete("/my-list/:id", authMiddleware, movieController.removeFromMyList);
router.post("/continue-watching", authMiddleware, movieController.updateContinueWatching);
router.get("/:id", authMiddleware, movieController.getMovieById);

module.exports = router;
