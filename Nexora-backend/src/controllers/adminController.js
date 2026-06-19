const { db, collection, getDocs, doc, deleteDoc, setDoc, getDoc, updateDoc } = require("../config/firebase");

// GET /api/admin/dashboard-stats
const getDashboardStats = async (req, res) => {
  try {
    // 1. Clean up stale sessions first (imported inline or done as part of request)
    // We will clean up stale sessions using a helper similar to screenController
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const sessionsRef = collection(db, "sessions");
    const sessionsSnap = await getDocs(sessionsRef);
    
    // Clean up stale sessions in database & collect active streams
    const activeScreensList = [];
    const activeUserIdsFromStreams = new Set();

    for (const docSnap of sessionsSnap.docs) {
      const sessData = docSnap.data();
      if (sessData.lastHeartbeat < twoMinutesAgo) {
        // Stale session, ignore and clean up
        // Note: we can run delete non-blocking
        deleteDoc(doc(db, "sessions", docSnap.id)).catch(err => console.error("Stale session cleanup error in stats:", err));
      } else {
        activeScreensList.push({
          id: docSnap.id,
          userId: sessData.userId,
          username: sessData.username || "",
          email: sessData.email || "",
          deviceId: sessData.deviceId,
          screenName: sessData.screenName,
          lastHeartbeat: sessData.lastHeartbeat,
          createdAt: sessData.createdAt
        });
        if (sessData.userId) {
          activeUserIdsFromStreams.add(sessData.userId);
        }
      }
    }

    // 2. Fetch all users
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);
    const totalUsers = usersSnap.size;

    // 3. Fetch all plans to map plan prices
    const plansRef = collection(db, "plans");
    const plansSnap = await getDocs(plansRef);
    const planPriceMap = {};
    plansSnap.forEach(pDoc => {
      const p = pDoc.data();
      planPriceMap[p.name] = p.price;
    });
    // Defaults fallback
    planPriceMap["Basic"] = 149;
    planPriceMap["Standard"] = 899;
    planPriceMap["Premium"] = 1439;
    planPriceMap["Free"] = 0;

    // Calculate user metrics
    let activeSubscribersCount = 0;
    let estimatedMRR = 0;
    const planDistributionMap = { Basic: 0, Standard: 0, Premium: 0, Free: 0 };
    const activeUsersList = [];
    const activeUserIds = new Set(activeUserIdsFromStreams);

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    usersSnap.forEach(userDoc => {
      const u = userDoc.data();
      const id = userDoc.id;
      
      // Check subscription
      const sub = u.subscription;
      const planName = (sub && sub.planName) ? sub.planName : "Free";

      if (sub && sub.status === "active" && planName !== "Free") {
        activeSubscribersCount++;
        const price = planPriceMap[planName] || 0;
        estimatedMRR += price;
      }

      // Track plan distribution
      if (planDistributionMap[planName] !== undefined) {
        planDistributionMap[planName]++;
      } else {
        planDistributionMap[planName] = 1;
      }

      // Check if user is active (recently logged in or currently streaming)
      const isRecentlyLoggedIn = u.lastLoginAt && u.lastLoginAt >= fifteenMinsAgo;
      const isStreaming = activeUserIdsFromStreams.has(id);

      if (isRecentlyLoggedIn || isStreaming) {
        activeUsersList.push({
          username: u.username,
          email: u.email
        });
        activeUserIds.add(id);
      }
    });

    const activeUsersCount = activeUserIds.size;

    const planDistribution = Object.keys(planDistributionMap).map(name => ({
      planName: name,
      count: planDistributionMap[name]
    }));

    // 4. Fetch transactions and calculate total revenue
    const transactionsRef = collection(db, "transactions");
    const transSnap = await getDocs(transactionsRef);
    const allTrans = transSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort in memory to avoid index requirements in Firestore
    allTrans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentTransactions = allTrans.slice(0, 10);

    const totalRevenue = allTrans.reduce((sum, t) => sum + (t.pricePaid || 0), 0);

    return res.status(200).json({
      success: true,
      message: "Admin dashboard statistics retrieved successfully",
      data: {
        summary: {
          totalUsers,
          activeUsersCount,
          activeSubscribersCount,
          activeStreamsCount: activeScreensList.length,
          totalRevenue,
          estimatedMRR
        },
        planDistribution,
        activeUsersList,
        activeScreensList,
        recentTransactions
      }
    });

  } catch (error) {
    console.error("Get admin stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/admin/movies (Add Movie)
const addMovie = async (req, res) => {
  try {
    const { title, description, thumbnail, banner, videoUrl, genre, category, rating, year, featured, trending } = req.body;

    if (!title || !description || !thumbnail || !banner || !videoUrl || !genre || !category) {
      return res.status(422).json({
        success: false,
        message: "Missing required fields: title, description, thumbnail, banner, videoUrl, genre, category",
        data: null
      });
    }

    const movieId = "movie_" + Math.random().toString(36).substring(2, 15);
    const movieData = {
      id: movieId,
      title,
      description,
      thumbnail,
      banner,
      videoUrl, // Holds trailer or video stream
      genre,
      category,
      rating: rating !== undefined ? Number(rating) : 0,
      year: year !== undefined ? Number(year) : new Date().getFullYear(),
      featured: featured === true || featured === "true",
      trending: trending === true || trending === "true",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const movieRef = doc(db, "movies", movieId);
    await setDoc(movieRef, movieData);

    return res.status(201).json({
      success: true,
      message: "Movie added successfully",
      data: movieData
    });
  } catch (error) {
    console.error("Add movie error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// PUT /api/admin/movies/:id (Edit Movie)
const editMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movieRef = doc(db, "movies", id);
    const movieSnap = await getDoc(movieRef);

    if (!movieSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
        data: null
      });
    }

    const updates = {};
    const allowedFields = [
      "title", "description", "thumbnail", "banner", "videoUrl", 
      "genre", "category", "rating", "year", "featured", "trending"
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === "rating" || field === "year") {
          updates[field] = Number(req.body[field]);
        } else if (field === "featured" || field === "trending") {
          updates[field] = req.body[field] === true || req.body[field] === "true";
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    updates.updatedAt = new Date().toISOString();

    await updateDoc(movieRef, updates);

    // Get updated document
    const updatedSnap = await getDoc(movieRef);

    return res.status(200).json({
      success: true,
      message: "Movie updated successfully",
      data: { id: updatedSnap.id, ...updatedSnap.data() }
    });
  } catch (error) {
    console.error("Edit movie error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// DELETE /api/admin/movies/:id (Delete Movie)
const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movieRef = doc(db, "movies", id);
    const movieSnap = await getDoc(movieRef);

    if (!movieSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
        data: null
      });
    }

    await deleteDoc(movieRef);

    return res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
      data: null
    });
  } catch (error) {
    console.error("Delete movie error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// Helper for file uploads
const handleFileUpload = (fieldName) => {
  return async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: `No file uploaded for ${fieldName}`,
          data: null
        });
      }

      const host = req.get("host");
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      return res.status(200).json({
        success: true,
        message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} uploaded successfully`,
        data: {
          filename: req.file.filename,
          url: fileUrl
        }
      });
    } catch (error) {
      console.error(`Upload ${fieldName} error:`, error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error during file upload",
        data: null
      });
    }
  };
};

const uploadThumbnail = handleFileUpload("thumbnail");
const uploadBanner = handleFileUpload("banner");
const uploadTrailer = async (req, res) => {
  try {
    // 1. If a file is uploaded via multer
    if (req.file) {
      const host = req.get("host");
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      return res.status(200).json({
        success: true,
        message: "Trailer uploaded successfully",
        data: {
          filename: req.file.filename,
          url: fileUrl
        }
      });
    }

    // 2. If a YouTube URL or other external link is sent in body
    const inputUrl = req.body.url || req.body.youtubeUrl || req.body.trailerUrl;
    if (inputUrl) {
      if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
        return res.status(400).json({
          success: false,
          message: "Invalid URL format. Must start with http:// or https://",
          data: null
        });
      }

      return res.status(200).json({
        success: true,
        message: "Trailer external link registered successfully",
        data: {
          filename: "external-link",
          url: inputUrl
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: "No file uploaded or trailer link provided in the body",
      data: null
    });
  } catch (error) {
    console.error("Upload trailer error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error during trailer upload",
      data: null
    });
  }
};

module.exports = {
  getDashboardStats,
  addMovie,
  editMovie,
  deleteMovie,
  uploadThumbnail,
  uploadBanner,
  uploadTrailer
};
