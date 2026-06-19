process.env.USE_MOCK_DB = "true"; // Force mock database for integration tests
require("./src/index.js"); // Start Express server in-process

const { db, collection, getDocs, query, where, limit, doc, updateDoc } = require("./src/config/firebase");

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to query OTP from Firestore
const getOTPFromDB = async (email) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().otp;
};

// Helper to check user subscription status
const getUserSubscription = async (email) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().subscription;
};

// Helper to promote a user to admin in the test DB
const promoteToAdmin = async (email) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error(`Cannot promote ${email} to admin: user not found`);
  }
  const userDoc = snap.docs[0];
  const userRef = doc(db, "users", userDoc.id);
  await updateDoc(userRef, { role: "admin" });
  console.log(`Successfully promoted ${email} to admin in DB.`);
};

const runTests = async () => {
  const fs = require("fs");
  const path = require("path");
  const dbPath = path.join(__dirname, "db.json");
  if (fs.existsSync(dbPath)) {
    console.log("Cleaning up previous test database...");
    fs.unlinkSync(dbPath);
  }

  console.log("Starting Netflix Backend API integration tests...");
  let adminToken = "";
  let userToken = "";
  let basicPlanId = "";
  let premiumPlanId = "";

  const adminEmail = `admin_test_${Date.now()}@example.com`;
  const userEmail = `user_test_${Date.now()}@example.com`;

  try {
    // ----------------------------------------------------
    // TEST 1: Register Admin (First user becomes Admin)
    // ----------------------------------------------------
    console.log("\n[TEST 1] Registering Admin user...");
    const signupAdminRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin_tester",
        dateOfBirth: "1988-12-10",
        gender: "female",
        email: adminEmail,
        password: "AdminPassword123!"
      })
    });
    const signupAdminJson = await signupAdminRes.json();
    console.log("Response:", signupAdminJson);
    if (!signupAdminJson.success) throw new Error("Admin registration failed");

    // Fetch OTP from Firestore
    console.log("Retrieving Admin OTP from Firestore...");
    const dbJsonPath = path.join(__dirname, "db.json");
    if (fs.existsSync(dbJsonPath)) {
      console.log("Current DB Content:", fs.readFileSync(dbJsonPath, "utf-8"));
    } else {
      console.log("db.json file does NOT exist!");
    }
    const adminOtp = await getOTPFromDB(adminEmail);
    console.log("Admin OTP:", adminOtp);
    if (!adminOtp) throw new Error("Admin OTP not found in DB");

    // Promote the user to admin so they have access to admin actions in the tests
    console.log("Promoting test user to admin...");
    await promoteToAdmin(adminEmail);

    // Verify Admin Email
    console.log("Verifying Admin email...");
    const verifyAdminRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        otp: adminOtp
      })
    });
    const verifyAdminJson = await verifyAdminRes.json();
    console.log("Response:", verifyAdminJson);
    if (!verifyAdminJson.success) throw new Error("Admin email verification failed");

    // Login Admin
    console.log("Logging in Admin...");
    const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: "AdminPassword123!"
      })
    });
    const loginAdminJson = await loginAdminRes.json();
    console.log("Response:", loginAdminJson);
    if (!loginAdminJson.success) throw new Error("Admin login failed");
    adminToken = loginAdminJson.data.token;
    console.log("Admin Token acquired.");

    // ----------------------------------------------------
    // TEST 2: Register Standard User
    // ----------------------------------------------------
    console.log("\n[TEST 2] Registering Standard User...");
    const signupUserRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "standard_tester",
        dateOfBirth: "1995-05-20",
        gender: "male",
        email: userEmail,
        password: "UserPassword123!"
      })
    });
    const signupUserJson = await signupUserRes.json();
    console.log("Response:", signupUserJson);
    if (!signupUserJson.success) throw new Error("Standard User registration failed");

    // Fetch OTP
    console.log("Retrieving User OTP from Firestore...");
    const userOtp = await getOTPFromDB(userEmail);
    console.log("User OTP:", userOtp);
    if (!userOtp) throw new Error("User OTP not found in DB");

    // Verify User Email
    console.log("Verifying User email...");
    const verifyUserRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        otp: userOtp
      })
    });
    const verifyUserJson = await verifyUserRes.json();
    if (!verifyUserJson.success) throw new Error("User email verification failed");

    // Login User
    console.log("Logging in User...");
    const loginUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        password: "UserPassword123!"
      })
    });
    const loginUserJson = await loginUserRes.json();
    if (!loginUserJson.success) throw new Error("User login failed");
    userToken = loginUserJson.data.token;
    console.log("User Token acquired.");

    // ----------------------------------------------------
    // TEST 3: Plans & Subscriptions
    // ----------------------------------------------------
    console.log("\n[TEST 3] Fetching Plans...");
    const plansRes = await fetch(`${BASE_URL}/api/subscriptions/plans`);
    const plansJson = await plansRes.json();
    console.log(`Retrieved ${plansJson.data.length} plans.`);
    plansJson.data.forEach(p => {
      console.log(`- ${p.name} ($${p.price}) [maxScreens: ${p.maxScreens}]`);
      if (p.name === "Basic") basicPlanId = p._id;
      if (p.name === "Premium") premiumPlanId = p._id;
    });

    // Test creating plan with User token (should FAIL)
    console.log("Attempting to create plan as regular user...");
    const createPlanFailRes = await fetch(`${BASE_URL}/api/subscriptions/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        name: "Hacker Plan",
        price: 0,
        maxScreens: 10
      })
    });
    console.log("Standard User Plan Create Response Code:", createPlanFailRes.status);
    if (createPlanFailRes.status !== 403) throw new Error("Regular user should not be able to create subscription plans");

    // Test creating plan with Admin token (should SUCCEED)
    console.log("Creating 'Super Premium' plan as Admin...");
    const createPlanRes = await fetch(`${BASE_URL}/api/subscriptions/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: "Super Premium",
        price: 1999,
        maxScreens: 6,
        resolution: "4K+HDR",
        videoQuality: "Best",
        description: "Stream on 6 screens concurrently in high fidelity.",
        isActive: true
      })
    });
    const createPlanJson = await createPlanRes.json();
    console.log("Response:", createPlanJson);
    if (!createPlanJson.success) throw new Error("Admin plan creation failed");

    // ----------------------------------------------------
    // TEST 4: Subscribe to plan & enforce screening limits
    // ----------------------------------------------------
    console.log("\n[TEST 4] Subscribing standard user to 'Basic' (1 screen)...");
    const subscribeRes = await fetch(`${BASE_URL}/api/subscriptions/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        planId: basicPlanId
      })
    });
    const subscribeJson = await subscribeRes.json();
    console.log("Subscribe response:", subscribeJson);
    if (!subscribeJson.success) throw new Error("Subscription failed");

    // Verify DB update
    const dbSub = await getUserSubscription(userEmail);
    console.log("User subscription details in DB:", dbSub);

    // Start Screen 1 (Laptop) - should succeed
    console.log("Starting Screen 1 (Laptop)...");
    const screen1Res = await fetch(`${BASE_URL}/api/screens/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        deviceId: "laptop-chrome-1",
        screenName: "Living Room TV"
      })
    });
    const screen1Json = await screen1Res.json();
    console.log("Screen 1 response:", screen1Json);
    if (!screen1Json.success) throw new Error("Screen 1 streaming start failed");

    // Start Screen 2 (TV) - should FAIL because limit is 1
    console.log("Starting Screen 2 (Mobile App) [Expect Rejection]...");
    const screen2Res = await fetch(`${BASE_URL}/api/screens/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        deviceId: "mobile-app-2",
        screenName: "Bedroom TV"
      })
    });
    const screen2Json = await screen2Res.json();
    console.log("Screen 2 Response Status:", screen2Res.status);
    console.log("Screen 2 Response Body:", screen2Json);
    if (screen2Res.status !== 403) throw new Error("Concurrent screen limit enforcement failed. Should have rejected.");

    // Send Heartbeat for Screen 1
    console.log("Sending heartbeat for Screen 1...");
    const heartbeatRes = await fetch(`${BASE_URL}/api/screens/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        deviceId: "laptop-chrome-1"
      })
    });
    console.log("Heartbeat Response Status:", heartbeatRes.status);
    if (heartbeatRes.status !== 200) throw new Error("Heartbeat failed");

    // Get Active Screens for user
    console.log("Getting active screens for user...");
    const activeRes = await fetch(`${BASE_URL}/api/screens/active`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    const activeJson = await activeRes.json();
    console.log("Active screens data:", activeJson);
    if (activeJson.data.length !== 1) throw new Error("Active screens count mismatch");

    // ----------------------------------------------------
    // TEST 5: Admin Dashboard Stats
    // ----------------------------------------------------
    console.log("\n[TEST 5] Fetching Admin Dashboard stats...");
    const statsRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const statsJson = await statsRes.json();
    console.log("Dashboard Stats:", JSON.stringify(statsJson.data, null, 2));
    if (!statsJson.success) throw new Error("Failed to fetch dashboard stats");
    
    // Validate telemetry
    const summary = statsJson.data.summary;
    console.log(`Telemetry verification:`);
    console.log(`- totalUsers: ${summary.totalUsers} (expected 2)`);
    console.log(`- activeUsersCount: ${summary.activeUsersCount} (expected 2)`);
    console.log(`- activeSubscribersCount: ${summary.activeSubscribersCount} (expected 1)`);
    console.log(`- activeStreamsCount: ${summary.activeStreamsCount} (expected 1)`);
    console.log(`- totalRevenue: ${summary.totalRevenue} (expected 149)`);
    console.log(`- estimatedMRR: ${summary.estimatedMRR} (expected 149)`);

    if (summary.totalUsers < 2 || summary.activeSubscribersCount !== 1) {
      throw new Error("Telemetry values invalid");
    }

    // ----------------------------------------------------
    // TEST 6: Cancel Subscription & Screen Cleanup
    // ----------------------------------------------------
    console.log("\n[TEST 6] Cancelling subscription for user...");
    const cancelRes = await fetch(`${BASE_URL}/api/subscriptions/cancel`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    const cancelJson = await cancelRes.json();
    console.log("Cancel subscription response:", cancelJson);
    if (!cancelJson.success) throw new Error("Subscription cancellation failed");

    // Verify Active Screens is now 0 (disconnected on cancellation)
    console.log("Verifying active screens after cancellation...");
    const activePostCancelRes = await fetch(`${BASE_URL}/api/screens/active`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    const activePostCancelJson = await activePostCancelRes.json();
    console.log("Active screens post-cancellation:", activePostCancelJson);
    if (activePostCancelJson.data.length !== 0) {
      throw new Error("Active screens should have been cleared on cancellation");
    }

    // ----------------------------------------------------
    // TEST 7: Logout & Token Blacklist
    // ----------------------------------------------------
    console.log("\n[TEST 7] Logging out user...");
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("Logout status:", logoutRes.status);
    if (logoutRes.status !== 200) throw new Error("Logout failed");

    console.log("Verifying logged-out token is rejected...");
    const profileRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("Profile check with logged-out token status:", profileRes.status);
    if (profileRes.status !== 401) throw new Error("Blacklisted token was not rejected");

    console.log("\n==================================================");
    console.log(" ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY! ");
    console.log("==================================================");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exit(1);
  }
};

// Delay to make sure server is ready if launched simultaneously
setTimeout(runTests, 2000);
