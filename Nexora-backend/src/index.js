const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { swaggerUi, swaggerDocument } = require("./swagger/swagger");
const { seedMovies } = require("./config/movieSeeder");

// Route imports
const authRoutes = require("./routes/auth");
const subscriptionRoutes = require("./routes/subscriptions");
const screenRoutes = require("./routes/screens");
const adminRoutes = require("./routes/admin");
const movieRoutes = require("./routes/movies");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all requests
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Serve static uploads
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));


// Bind API route endpoints
app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/screens", screenRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/movies", movieRoutes);

// Setup Swagger API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Base root endpoint redirecting to api docs
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

// Custom 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route not found",
    data: null
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler caught an error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message
  });
});

// Seed movies and start listening
(async () => {
  try {
    await seedMovies();
  } catch (error) {
    console.error("Movie seeding error on startup:", error);
  }

  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Netflix Subscription & Screen Backend running!`);
    console.log(` Port: ${PORT}`);
    console.log(` Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`==================================================`);
  });
})();
