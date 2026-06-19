const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, limit } = require("../config/firebase");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../config/mailer");
require("dotenv").config();

// Helper to generate a 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to find a user by email
const findUserByEmail = async (email) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.toLowerCase().trim()), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const userDoc = querySnapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() };
};

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    console.log("DEBUG SIGNUP CALLED!");
    console.log("DEBUG db.type:", db ? db.type : "undefined");
    console.log("DEBUG setDoc:", setDoc ? setDoc.toString() : "undefined");
    const { username, dateOfBirth, gender, email, password } = req.body;

    // Validation
    if (!username || !dateOfBirth || !gender || !email || !password) {
      return res.status(422).json({
        success: false,
        message: "All fields (username, dateOfBirth, gender, email, password) are required.",
        data: null
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(422).json({
        success: false,
        message: "Invalid email format",
        data: null
      });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
        data: null
      });
    }

    // Default signup role is always 'user'
    const role = "user";

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Create user document
    const userId = doc(collection(db, "users")).id;
    const newUser = {
      username,
      dateOfBirth,
      gender,
      email: email.toLowerCase().trim(),
      passwordHash,
      isVerified: false,
      role,
      otp,
      otpExpires,
      subscription: {
        status: "Free",
        planId: null,
        planName: "Free",
        maxScreens: 0,
        expiresAt: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, "users", userId), newUser);

    // Send verification email (non-blocking)
    sendVerificationEmail(newUser.email, otp).catch(err => console.error("Error sending signup email:", err));

    return res.status(201).json({
      success: true,
      message: "User registered – OTP sent to email",
      data: {}
    });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
        data: null
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
        data: null
      });
    }

    // Verify OTP
    if (user.otp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
        data: null
      });
    }

    // Update user status
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
      isVerified: true,
      otp: null,
      otpExpires: null,
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {}
    });

  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/auth/resend-verification-otp
const resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        data: null
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
        data: null
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
      otp,
      otpExpires,
      updatedAt: new Date().toISOString()
    });

    // Send email
    sendVerificationEmail(user.email, otp).catch(err => console.error("Error sending resend OTP email:", err));

    return res.status(200).json({
      success: true,
      message: "A new verification OTP has been sent to your email",
      data: null
    });

  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        data: null
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        data: null
      });
    }

    // Check if verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        data: null
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        data: null
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Track active status or update login timestamp
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          subscription: user.subscription
        }
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const token = req.token;
    const expiry = req.tokenExpiry;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
        data: null
      });
    }

    // Add token to blacklistedTokens collection
    const blacklistRef = doc(db, "blacklistedTokens", token);
    await setDoc(blacklistRef, {
      blacklistedAt: new Date().toISOString(),
      expiresAt: expiry // Unix timestamp of when token expires
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      data: {}
    });

  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        data: null
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
        data: null
      });
    }

    // Generate reset OTP
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
      resetOtp: otp,
      resetOtpExpires: otpExpires,
      updatedAt: new Date().toISOString()
    });

    // Send reset email
    sendPasswordResetEmail(user.email, otp).catch(err => console.error("Error sending reset password email:", err));

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
      data: null
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and newPassword are required",
        data: null
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null
      });
    }

    // Verify OTP
    if (!user.resetOtp || user.resetOtp !== otp || Date.now() > user.resetOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
        data: null
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
      passwordHash,
      resetOtp: null,
      resetOtpExpires: null,
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: {}
    });

  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: "User details retrieved successfully",
      data: {
        username: req.user.username,
        email: req.user.email,
        dateOfBirth: req.user.dateOfBirth,
        gender: req.user.gender,
        role: req.user.role,
        subscription: req.user.subscription
      }
    });

  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// GET /api/auth/users
const getUsers = async (req, res) => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username,
        email: data.email,
        role: data.role,
        subscription: data.subscription,
        createdAt: data.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users
    });

  } catch (error) {
    console.error("GetUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

module.exports = {
  signup,
  verifyEmail,
  resendVerificationOtp,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  getUsers
};
