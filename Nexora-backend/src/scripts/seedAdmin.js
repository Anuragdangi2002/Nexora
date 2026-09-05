const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { db, collection, doc, setDoc, getDocs, deleteDoc, query, where } = require("../config/firebase");

const seedAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@nexora.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminSecretPass123!";
    const adminUsername = process.env.ADMIN_USERNAME || "NexoraAdmin";

    console.log("==================================================");
    console.log(" Seeding Initial Admin Account for Nexora         ");
    console.log("==================================================");

    // 1. Clear previous active sessions & blacklisted tokens to revoke old developer access
    console.log("Revoking previous developer sessions and tokens...");
    const sessionsRef = collection(db, "sessions");
    const sessionsSnap = await getDocs(sessionsRef);
    for (const sessionDoc of sessionsSnap.docs) {
      await deleteDoc(doc(db, "sessions", sessionDoc.id));
    }

    const blacklistRef = collection(db, "blacklistedTokens");
    const blacklistSnap = await getDocs(blacklistRef);
    for (const bDoc of blacklistSnap.docs) {
      await deleteDoc(doc(db, "blacklistedTokens", bDoc.id));
    }

    // 2. Check if admin user already exists and delete existing admin entry for clean slate
    const usersRef = collection(db, "users");
    const qAdmin = query(usersRef, where("email", "==", adminEmail));
    const adminSnap = await getDocs(qAdmin);

    for (const userDoc of adminSnap.docs) {
      console.log(`Removing existing user record for: ${adminEmail}`);
      await deleteDoc(doc(db, "users", userDoc.id));
    }

    // 3. Create initial Admin account
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const userId = "admin_" + Math.random().toString(36).substring(2, 12);

    const adminUser = {
      id: userId,
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: "admin",
      isVerified: true,
      dateOfBirth: "1990-01-01",
      gender: "other",
      subscription: {
        status: "active",
        planId: "admin_plan",
        planName: "Premium",
        maxScreens: 10,
        expiresAt: "2099-12-31T23:59:59.999Z"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, "users", userId), adminUser);

    console.log("✅ Initial Admin Account Created Successfully!");
    console.log(`- Username: ${adminUsername}`);
    console.log(`- Email:    ${adminEmail}`);
    console.log(`- Role:     admin`);
    console.log(`- Verified: true`);
    console.log("==================================================");
    console.log("Credentials can be modified via environment variables ADMIN_EMAIL & ADMIN_PASSWORD in backend .env");
    console.log("==================================================");

    process.exit(0);
  } catch (error) {
    console.error("❌ Admin Seeding Failed:", error);
    process.exit(1);
  }
};

seedAdmin();
