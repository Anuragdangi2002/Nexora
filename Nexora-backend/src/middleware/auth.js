const jwt = require("jsonwebtoken");
const { db, doc, getDoc } = require("../config/firebase");
require("dotenv").config();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
        data: null
      });
    }

    const token = authHeader.split(" ")[1];
    
    // Check token blacklist
    const blacklistRef = doc(db, "blacklistedTokens", token);
    const blacklistSnap = await getDoc(blacklistRef);
    if (blacklistSnap.exists()) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token is invalidated.",
        data: null
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid or expired token.",
        data: null
      });
    }

    // Retrieve user from Firestore
    const userRef = doc(db, "users", decoded.userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null
      });
    }

    const userData = userSnap.data();

    // Check if user is verified (only allow access to routes if email is verified, except maybe verification/resend endpoints)
    // Wait, some auth routes are publicly accessible, and me / screens / subscriptions require verified user.
    // Let's attach full user to req
    req.user = {
      id: userSnap.id,
      ...userData
    };
    req.token = token;
    req.tokenExpiry = decoded.exp; // expiry timestamp

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error during authentication",
      data: null
    });
  }
};

module.exports = authMiddleware;
