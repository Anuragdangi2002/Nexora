const { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, addDoc } = require("../config/firebase");

// Default plans data to seed when database is empty
const defaultPlans = [
  {
    name: "Basic",
    price: 149,
    maxScreens: 1,
    resolution: "720p",
    videoQuality: "Good",
    description: "Watch on 1 screen in Standard Definition (720p).",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Standard",
    price: 899,
    maxScreens: 2,
    resolution: "1080p",
    videoQuality: "Better",
    description: "Watch on 2 screens at the same time in Full HD (1080p).",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Premium",
    price: 1439,
    maxScreens: 4,
    resolution: "4K+HDR",
    videoQuality: "Best",
    description: "Watch on 4 screens at the same time in Ultra HD (4K+HDR).",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper to seed plans if none exist
const seedPlansIfEmpty = async () => {
  const plansRef = collection(db, "plans");
  const snapshot = await getDocs(plansRef);
  if (snapshot.empty) {
    console.log("Seeding default subscription plans...");
    for (const plan of defaultPlans) {
      const planId = doc(plansRef).id;
      await setDoc(doc(db, "plans", planId), plan);
    }
  }
};

// GET /api/subscriptions/plans
const getPlans = async (req, res) => {
  try {
    await seedPlansIfEmpty();
    const plansRef = collection(db, "plans");
    const q = query(plansRef, where("isActive", "==", true));
    const snapshot = await getDocs(q);
    
    const plans = snapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({
      success: true,
      message: "Subscription plans retrieved successfully",
      data: plans
    });
  } catch (error) {
    console.error("Get plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// GET /api/subscriptions/admin/plans (Admin only)
const getAdminPlans = async (req, res) => {
  try {
    await seedPlansIfEmpty();
    const plansRef = collection(db, "plans");
    const snapshot = await getDocs(plansRef);
    
    const plans = snapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({
      success: true,
      message: "Plans retrieved successfully",
      data: plans
    });
  } catch (error) {
    console.error("Get admin plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/subscriptions/plans (Admin only)
const createPlan = async (req, res) => {
  try {
    const { name, price, maxScreens, resolution, videoQuality, description, isActive } = req.body;

    if (!name || price === undefined || maxScreens === undefined) {
      return res.status(400).json({
        success: false,
        message: "Plan name, price, and maxScreens are required.",
        data: null
      });
    }

    // Check if name already exists (case-insensitive search)
    const plansRef = collection(db, "plans");
    const q = query(plansRef, where("name", "==", name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return res.status(409).json({
        success: false,
        message: "Plan name already exists",
        data: null
      });
    }

    const planId = doc(plansRef).id;
    const newPlan = {
      name,
      price: Number(price),
      maxScreens: Number(maxScreens),
      resolution: resolution || "1080p",
      videoQuality: videoQuality || "Better",
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, "plans", planId), newPlan);

    return res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      data: {
        _id: planId,
        ...newPlan
      }
    });

  } catch (error) {
    console.error("Create plan error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// PUT /api/subscriptions/plans/{id} (Admin only)
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const planRef = doc(db, "plans", id);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
        data: null
      });
    }

    const finalUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // Cast fields to correct types if they are provided
    if (finalUpdate.price !== undefined) finalUpdate.price = Number(finalUpdate.price);
    if (finalUpdate.maxScreens !== undefined) finalUpdate.maxScreens = Number(finalUpdate.maxScreens);

    await updateDoc(planRef, finalUpdate);

    // Retrieve updated doc
    const updatedSnap = await getDoc(planRef);

    return res.status(200).json({
      success: true,
      message: "Subscription plan updated successfully",
      data: {
        _id: id,
        ...updatedSnap.data()
      }
    });

  } catch (error) {
    console.error("Update plan error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// DELETE /api/subscriptions/plans/{id} (Admin only)
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const planRef = doc(db, "plans", id);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
        data: null
      });
    }

    await deleteDoc(planRef);

    return res.status(200).json({
      success: true,
      message: "Subscription plan deleted successfully",
      data: null
    });

  } catch (error) {
    console.error("Delete plan error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/subscriptions/subscribe
const subscribe = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
        data: null
      });
    }

    // Retrieve plan
    const planRef = doc(db, "plans", planId);
    const planSnap = await getDoc(planRef);
    if (!planSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
        data: null
      });
    }

    const planData = planSnap.data();

    // Verify user exists (redundant but good check)
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null
      });
    }

    // Update user subscription
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const subscription = {
      status: "active",
      planId: planSnap.id,
      planName: planData.name,
      maxScreens: planData.maxScreens,
      resolution: planData.resolution,
      expiresAt: oneMonthFromNow.toISOString()
    };

    await updateDoc(userRef, {
      subscription,
      updatedAt: new Date().toISOString()
    });

    // Record transaction
    const transactionId = doc(collection(db, "transactions")).id;
    const transaction = {
      userId,
      email: req.user.email,
      planId: planSnap.id,
      planName: planData.name,
      pricePaid: planData.price,
      timestamp: new Date().toISOString()
    };

    await setDoc(doc(db, "transactions", transactionId), transaction);

    return res.status(200).json({
      success: true,
      message: "Subscribed successfully. Payment registered.",
      data: {
        subscription,
        transactionId,
        amountPaid: planData.price
      }
    });

  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

// POST /api/subscriptions/cancel
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
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
    if (!userData.subscription || userData.subscription.status !== "active" || userData.subscription.planName === "Free") {
      return res.status(400).json({
        success: false,
        message: "User does not have an active subscription",
        data: null
      });
    }

    // Revert user status to Free
    await updateDoc(userRef, {
      subscription: {
        status: "Free",
        planId: null,
        planName: "Free",
        maxScreens: 0,
        expiresAt: null
      },
      updatedAt: new Date().toISOString()
    });

    // Disconnect all currently streaming screens (delete all sessions for this user)
    const sessionsRef = collection(db, "sessions");
    const q = query(sessionsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    for (const sessionDoc of snapshot.docs) {
      await deleteDoc(doc(db, "sessions", sessionDoc.id));
    }

    return res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      data: null
    });

  } catch (error) {
    console.error("Cancel subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null
    });
  }
};

module.exports = {
  getPlans,
  getAdminPlans,
  createPlan,
  updatePlan,
  deletePlan,
  subscribe,
  cancelSubscription
};
