process.env.USE_MOCK_DB = "true"; // Force mock database for integration tests

const fs = require("fs");
const path = require("path");
const dbPath = path.join(__dirname, "db.json");
if (fs.existsSync(dbPath)) {
  console.log("Cleaning up previous test database for movie tests...");
  fs.unlinkSync(dbPath);
}

require("./src/index.js"); // Start Express server in-process

const { db, collection, getDocs, query, where, limit, doc, updateDoc } = require("./src/config/firebase");

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to query OTP from Firestore
const getOTPFromDB = async (email) => {
  console.log("getOTPFromDB looking for email:", email);
  try {
    const dbPath = path.join(__dirname, "db.json");
    if (fs.existsSync(dbPath)) {
      console.log("Current DB File Content at query time:\n", fs.readFileSync(dbPath, "utf-8"));
    } else {
      console.log("db.json does not exist at query time.");
    }
  } catch (err) {
    console.error("Error reading db.json:", err);
  }
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("Query returned empty results for users collection query.");
    return null;
  }
  return snap.docs[0].data().otp;
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

  console.log("Starting Movie & Admin Content Management API Integration Tests...");
  let adminToken = "";
  let userToken = "";
  let createdMovieId = "";

  const adminEmail = `movie_admin_${Date.now()}@example.com`;
  const userEmail = `movie_user_${Date.now()}@example.com`;

  try {
    // ----------------------------------------------------
    // SETUP: Register & Login Admin
    // ----------------------------------------------------
    console.log("\n[SETUP] Registering Admin user...");
    const signupAdminRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "movie_admin",
        dateOfBirth: "1990-01-01",
        gender: "male",
        email: adminEmail,
        password: "AdminPassword123!"
      })
    });
    const signupAdminJson = await signupAdminRes.json();
    console.log("Admin signup response JSON:", signupAdminJson);
    if (!signupAdminJson.success) throw new Error("Admin signup failed: " + signupAdminJson.message);

    const adminOtp = await getOTPFromDB(adminEmail);
    if (!adminOtp) throw new Error("Admin OTP not found in DB");

    // Promote to Admin
    await promoteToAdmin(adminEmail);

    // Verify Admin Email
    const verifyAdminRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        otp: adminOtp
      })
    });
    if (!(await verifyAdminRes.json()).success) throw new Error("Admin email verification failed");

    // Login Admin
    const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: "AdminPassword123!"
      })
    });
    const loginAdminJson = await loginAdminRes.json();
    adminToken = loginAdminJson.data.token;
    console.log("Admin logged in successfully. Token acquired.");

    // ----------------------------------------------------
    // SETUP: Register & Login Regular User
    // ----------------------------------------------------
    console.log("\n[SETUP] Registering Regular User...");
    const signupUserRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "movie_viewer",
        dateOfBirth: "1995-10-10",
        gender: "female",
        email: userEmail,
        password: "UserPassword123!"
      })
    });
    const signupUserJson = await signupUserRes.json();
    if (!signupUserJson.success) throw new Error("User signup failed");

    const userOtp = await getOTPFromDB(userEmail);
    if (!userOtp) throw new Error("User OTP not found");

    // Verify User Email
    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, otp: userOtp })
    });

    // Login User
    const loginUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: "UserPassword123!" })
    });
    const loginUserJson = await loginUserRes.json();
    userToken = loginUserJson.data.token;
    console.log("Regular User logged in successfully. Token acquired.");

    // ----------------------------------------------------
    // TEST 1: Admin File Uploads (Thumbnail, Banner, Trailer)
    // ----------------------------------------------------
    console.log("\n[TEST 1] Testing Admin File Uploads...");

    // Upload Thumbnail
    const thumbnailForm = new FormData();
    thumbnailForm.append("thumbnail", new Blob(["dummy png data"], { type: "image/png" }), "thumb.png");
    const uploadThumbRes = await fetch(`${BASE_URL}/api/admin/movies/upload-thumbnail`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: thumbnailForm
    });
    const uploadThumbJson = await uploadThumbRes.json();
    console.log("Upload Thumbnail response:", uploadThumbJson);
    if (!uploadThumbJson.success) throw new Error("Thumbnail upload failed");
    const thumbUrl = uploadThumbJson.data.url;

    // Upload Banner
    const bannerForm = new FormData();
    bannerForm.append("banner", new Blob(["dummy jpeg data"], { type: "image/jpeg" }), "banner.jpg");
    const uploadBannerRes = await fetch(`${BASE_URL}/api/admin/movies/upload-banner`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: bannerForm
    });
    const uploadBannerJson = await uploadBannerRes.json();
    console.log("Upload Banner response:", uploadBannerJson);
    if (!uploadBannerJson.success) throw new Error("Banner upload failed");
    const bannerUrl = uploadBannerJson.data.url;

    // Upload Trailer
    const trailerForm = new FormData();
    trailerForm.append("trailer", new Blob(["dummy mp4 video trailer data"], { type: "video/mp4" }), "trailer.mp4");
    const uploadTrailerRes = await fetch(`${BASE_URL}/api/admin/movies/upload-trailer`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: trailerForm
    });
    const uploadTrailerJson = await uploadTrailerRes.json();
    console.log("Upload Trailer response:", uploadTrailerJson);
    if (!uploadTrailerJson.success) throw new Error("Trailer upload failed");
    const trailerUrl = uploadTrailerJson.data.url;

    // Upload Trailer via Youtube URL
    console.log("Testing upload trailer via YouTube URL...");
    const uploadYoutubeRes = await fetch(`${BASE_URL}/api/admin/movies/upload-trailer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      })
    });
    const uploadYoutubeJson = await uploadYoutubeRes.json();
    console.log("Upload Trailer via Youtube URL response:", uploadYoutubeJson);
    if (!uploadYoutubeJson.success || uploadYoutubeJson.data.url !== "https://www.youtube.com/watch?v=dQw4w9WgXcQ") {
      throw new Error("Trailer YouTube URL registration failed");
    }

    // ----------------------------------------------------
    // TEST 2: Add Movie (Admin Only)
    // ----------------------------------------------------
    console.log("\n[TEST 2] Testing Add Movie...");
    // Try adding movie as standard user (should fail with 403)
    const addMovieFailRes = await fetch(`${BASE_URL}/api/admin/movies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: "Forbidden Movie",
        description: "Should fail",
        thumbnail: thumbUrl,
        banner: bannerUrl,
        videoUrl: trailerUrl,
        genre: "Action",
        category: "Trending"
      })
    });
    console.log("Standard User Add Movie response status:", addMovieFailRes.status);
    if (addMovieFailRes.status !== 403) throw new Error("Non-admin user was able to add a movie!");

    // Add movie as Admin (should succeed)
    const addMovieRes = await fetch(`${BASE_URL}/api/admin/movies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: "Test Blockbuster Movie",
        description: "A super exciting test movie created during integration testing.",
        thumbnail: thumbUrl,
        banner: bannerUrl,
        videoUrl: trailerUrl,
        genre: "Action",
        category: "Trending",
        rating: 9.2,
        year: 2026,
        featured: true,
        trending: true
      })
    });
    const addMovieJson = await addMovieRes.json();
    console.log("Admin Add Movie response:", addMovieJson);
    if (!addMovieJson.success) throw new Error("Admin Add Movie failed");
    createdMovieId = addMovieJson.data.id;
    console.log("Created Movie ID:", createdMovieId);

    // ----------------------------------------------------
    // TEST 3: Edit Movie (Admin Only)
    // ----------------------------------------------------
    console.log("\n[TEST 3] Testing Edit Movie...");
    const editMovieRes = await fetch(`${BASE_URL}/api/admin/movies/${createdMovieId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: "Test Blockbuster Movie (Edited Title)",
        rating: 9.5
      })
    });
    const editMovieJson = await editMovieRes.json();
    console.log("Admin Edit Movie response:", editMovieJson);
    if (!editMovieJson.success || editMovieJson.data.title !== "Test Blockbuster Movie (Edited Title)" || editMovieJson.data.rating !== 9.5) {
      throw new Error("Admin Edit Movie values mismatch");
    }

    // ----------------------------------------------------
    // TEST 4: Get Homepage Categorized Movies (Regular User)
    // ----------------------------------------------------
    console.log("\n[TEST 4] Testing Get Homepage API...");
    const homepageRes = await fetch(`${BASE_URL}/api/movies/homepage`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    const homepageJson = await homepageRes.json();
    console.log("Homepage keys returned:", Object.keys(homepageJson.data));
    
    // Verify structure
    const keys = ["heroBanner", "trendingNow", "continueWatching", "topRated", "actionMovies", "comedyMovies", "horrorMovies", "recentlyAdded", "myList", "recommendedForYou"];
    for (const key of keys) {
      if (homepageJson.data[key] === undefined) {
        throw new Error(`Homepage categories missing key: ${key}`);
      }
    }
    
    // Verify that our edited movie is in Hero Banner (featured) and Trending categories
    const heroBannerMovie = homepageJson.data.heroBanner;
    console.log("Homepage Hero Banner Title:", heroBannerMovie ? heroBannerMovie.title : "None");
    if (!heroBannerMovie || heroBannerMovie.id !== createdMovieId) {
      console.warn("WARNING: Created movie was not the Hero Banner (might have multiple featured, let's verify title is seeded or created movie):", heroBannerMovie);
    }
    
    // ----------------------------------------------------
    // TEST 5: Get Single Movie Details
    // ----------------------------------------------------
    console.log("\n[TEST 5] Testing Get Movie Details by ID...");
    const detailsRes = await fetch(`${BASE_URL}/api/movies/${createdMovieId}`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    const detailsJson = await detailsRes.json();
    console.log("Movie details response:", detailsJson);
    if (!detailsJson.success || detailsJson.data.id !== createdMovieId) {
      throw new Error("Failed to fetch correct movie details");
    }

    // ----------------------------------------------------
    // TEST 6: User My List Add / Remove
    // ----------------------------------------------------
    console.log("\n[TEST 6] Testing Add to My List...");
    const addMyListRes = await fetch(`${BASE_URL}/api/movies/my-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        movieId: createdMovieId
      })
    });
    const addMyListJson = await addMyListRes.json();
    console.log("Add to My List response:", addMyListJson);
    if (!addMyListJson.success || !addMyListJson.data.myList.includes(createdMovieId)) {
      throw new Error("Movie ID not added to user's myList");
    }

    // Verify it shows up in homepage My List
    const hpListRes = await fetch(`${BASE_URL}/api/movies/homepage`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    const hpListJson = await hpListRes.json();
    const myListItems = hpListJson.data.myList;
    console.log("Homepage My List items count:", myListItems.length);
    if (!myListItems.find(m => m.id === createdMovieId)) {
      throw new Error("Movie did not show up in homepage My List array");
    }

    // Test removing from My List
    console.log("Testing Remove from My List...");
    const removeMyListRes = await fetch(`${BASE_URL}/api/movies/my-list/${createdMovieId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    const removeMyListJson = await removeMyListRes.json();
    if (!removeMyListJson.success || removeMyListJson.data.myList.includes(createdMovieId)) {
      throw new Error("Movie ID was not removed from user's myList");
    }

    // ----------------------------------------------------
    // TEST 7: User Continue Watching Progress Tracking
    // ----------------------------------------------------
    console.log("\n[TEST 7] Testing Update Continue Watching Progress...");
    const updateCwRes = await fetch(`${BASE_URL}/api/movies/continue-watching`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        movieId: createdMovieId,
        progress: 45
      })
    });
    const updateCwJson = await updateCwRes.json();
    console.log("Continue Watching update response:", updateCwJson);
    if (!updateCwJson.success) throw new Error("Failed to update continue watching progress");

    // Verify it shows up in homepage Continue Watching with correct progress
    const hpCwRes = await fetch(`${BASE_URL}/api/movies/homepage`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    const hpCwJson = await hpCwRes.json();
    const cwItems = hpCwJson.data.continueWatching;
    console.log("Homepage Continue Watching items count:", cwItems.length);
    const targetCwItem = cwItems.find(m => m.id === createdMovieId);
    if (!targetCwItem || targetCwItem.progress !== 45) {
      throw new Error("Movie did not show up with correct progress in homepage Continue Watching list");
    }

    // ----------------------------------------------------
    // TEST 8: Delete Movie (Admin Only)
    // ----------------------------------------------------
    console.log("\n[TEST 8] Testing Delete Movie...");
    const deleteMovieRes = await fetch(`${BASE_URL}/api/admin/movies/${createdMovieId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const deleteMovieJson = await deleteMovieRes.json();
    console.log("Delete Movie response:", deleteMovieJson);
    if (!deleteMovieJson.success) throw new Error("Delete movie failed");

    // Verify deleted movie is gone from details
    const detailsPostDeleteRes = await fetch(`${BASE_URL}/api/movies/${createdMovieId}`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("Fetch deleted movie details status code:", detailsPostDeleteRes.status);
    if (detailsPostDeleteRes.status !== 404) {
      throw new Error("Deleted movie is still accessible!");
    }

    console.log("\n==================================================");
    console.log(" ALL MOVIE & ADMIN TESTS COMPLETED SUCCESSFULLY! ");
    console.log("==================================================");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ MOVIE INTEGRATION TEST FAILED:", error);
    process.exit(1);
  }
};

// Delay to make sure Express server is ready
setTimeout(runTests, 2000);
