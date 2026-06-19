const { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } = require("../config/firebase");

// Helper to clean up all stale sessions (no heartbeat for > 2 mins)
const cleanupStaleSessions = async () => {
  try {
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const sessionsRef = collection(db, "sessions");
    const q = query(sessionsRef, where("lastHeartbeat", "<", twoMinutesAgo));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log(`Cleaning up ${snapshot.size} stale session(s)...`);
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, "sessions", docSnap.id));
      }
    }
  } catch (error) {
    console.error("Error during stale sessions cleanup:", error);
  }
};

// POST /api/screens/start
const startStream = async (req, res) => {
  try {
    const { deviceId, screenName } = req.body;
    const userId = req.user.id;

    if (!deviceId || !screenName) {
      return res.status(400).json({
        success: false,
        message: "deviceId and screenName are required",
        data: null
      });
    }

    // 1. Clean up stale sessions first
    await cleanupStaleSessions();

    // 2. Verify user's active subscription
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null
      });
    }

    const userData = userSnap.data();
    const subscription = userData.subscription;

    if (!subscription || subscription.status !== "active" || subscription.planName === "Free") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Active subscription required to stream.",
        data: null
      });
    }

    const maxScreens = subscription.maxScreens || 0;

    // 3. Check existing sessions for this user
    const sessionsRef = collection(db, "sessions");
    const q = query(sessionsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    // Look for a session with the same deviceId
    let existingSessionDoc = null;
    const activeSessions = [];
    
    snapshot.forEach(docSnap => {
      const sess = docSnap.data();
      if (sess.deviceId === deviceId) {
        existingSessionDoc = docSnap;
      }
      activeSessions.push({ id: docSnap.id, ...sess });
    });

    if (existingSessionDoc) {
      // Device is already streaming, update session details and heartbeat
      const sessionRef = doc(db, "sessions", existingSessionDoc.id);
      const updatedSession = {
        screenName,
        lastHeartbeat: Date.now(),
        updatedAt: new Date().toISOString()
      };
      await updateDoc(sessionRef, updatedSession);

      return res.status(200).json({
        success: true,
        message: "Streaming session updated successfully",
        data: {
          session: {
            id: existingSessionDoc.id,
            userId,
            deviceId,
            screenName,
            lastHeartbeat: updatedSession.lastHeartbeat
          },
          activeScreensCount: activeSessions.length,
          maxScreensAllowed: maxScreens
        }
      });
    }

    // Checking screen limit
    if (activeSessions.length >= maxScreens) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Screen limit reached for subscription tier (${maxScreens} screen(s) max).`,
        data: null
      });
    }

    // Start a new session
    const sessionId = `${userId}_${deviceId}`; // Unique combination
    const newSession = {
      userId,
      username: userData.username, // for admin dashboard stats
      email: userData.email,
      deviceId,
      screenName,
      lastHeartbeat: Date.now(),
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, "sessions", sessionId), newSession);

    return res.status(200).json({
      success: true,
      message: "Streaming started successfully",
      data: {
        session: {
          id: sessionId,
          userId,
          deviceId,
          screenName,
          lastHeartbeat: newSession.lastHeartbeat
        },
        activeScreensCount: activeSessions.length + 1,
        maxScreensAllowed: maxScreens
      }
    });

  } catch (error) {
    console.error("Start stream error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/screens/heartbeat
const heartbeat = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
        data: null
      });
    }

    const sessionId = `${userId}_${deviceId}`;
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Stream session not found or timed out",
        data: null
      });
    }

    // Update heartbeat
    await updateDoc(sessionRef, {
      lastHeartbeat: Date.now()
    });

    return res.status(200).json({
      success: true,
      message: "Heartbeat received and streaming session extended",
      data: null
    });

  } catch (error) {
    console.error("Heartbeat error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/screens/stop
const stopStream = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
        data: null
      });
    }

    const sessionId = `${userId}_${deviceId}`;
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
        data: null
      });
    }

    await deleteDoc(sessionRef);

    return res.status(200).json({
      success: true,
      message: "Streaming stopped and screen session freed",
      data: null
    });

  } catch (error) {
    console.error("Stop stream error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// GET /api/screens/active
const getActiveScreens = async (req, res) => {
  try {
    const userId = req.user.id;

    // Clean up stale sessions first so stale ones don't skew results
    await cleanupStaleSessions();

    const sessionsRef = collection(db, "sessions");
    const q = query(sessionsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const activeScreens = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        deviceId: data.deviceId,
        screenName: data.screenName,
        lastHeartbeat: data.lastHeartbeat,
        createdAt: data.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      message: "Active screen streaming sessions retrieved successfully",
      data: activeScreens
    });

  } catch (error) {
    console.error("Get active screens error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

module.exports = {
  startStream,
  heartbeat,
  stopStream,
  getActiveScreens
};
