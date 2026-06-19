const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // Support up to 100MB trailer files
});

// Dashboard stats route
router.get("/dashboard-stats", authMiddleware, adminMiddleware, adminController.getDashboardStats);

// Movie content management routes
router.post("/movies", authMiddleware, adminMiddleware, adminController.addMovie);
router.put("/movies/:id", authMiddleware, adminMiddleware, adminController.editMovie);
router.delete("/movies/:id", authMiddleware, adminMiddleware, adminController.deleteMovie);

// File upload endpoints
router.post("/movies/upload-thumbnail", authMiddleware, adminMiddleware, upload.single("thumbnail"), adminController.uploadThumbnail);
router.post("/movies/upload-banner", authMiddleware, adminMiddleware, upload.single("banner"), adminController.uploadBanner);
router.post("/movies/upload-trailer", authMiddleware, adminMiddleware, upload.single("trailer"), adminController.uploadTrailer);

module.exports = router;
