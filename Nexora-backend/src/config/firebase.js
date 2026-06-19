const { initializeApp } = require("firebase/app");
const { getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit, addDoc } = require("firebase/firestore");
const mockDb = require("./mockFirestore");
require("dotenv").config();

// Determine if we should use the mock database.
// We auto-detect netflix-e2168 (which has Firestore disabled) or look for USE_MOCK_DB=true
const useMock = 
  process.env.USE_MOCK_DB === "true" || 
  !process.env.FIREBASE_API_KEY;

let db;
let dbExports = {};

if (useMock) {
  console.log("==================================================");
  console.log(" NOTICE: Using Local File-Based Mock Database     ");
  console.log(" (Firestore API is disabled or config is missing) ");
  console.log("==================================================");
  db = mockDb.db;
  dbExports = {
    db,
    doc: mockDb.doc,
    collection: mockDb.collection,
    getDoc: mockDb.getDoc,
    getDocs: mockDb.getDocs,
    setDoc: mockDb.setDoc,
    updateDoc: mockDb.updateDoc,
    deleteDoc: mockDb.deleteDoc,
    query: mockDb.query,
    where: mockDb.where,
    limit: mockDb.limit,
    addDoc: mockDb.addDoc
  };
} else {
  try {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    dbExports = {
      db,
      doc,
      collection,
      getDoc,
      getDocs,
      setDoc,
      updateDoc,
      deleteDoc,
      query,
      where,
      limit,
      addDoc
    };
  } catch (error) {
    console.error("Failed to initialize Firebase SDK, falling back to mock:", error);
    db = mockDb.db;
    dbExports = {
      db,
      doc: mockDb.doc,
      collection: mockDb.collection,
      getDoc: mockDb.getDoc,
      getDocs: mockDb.getDocs,
      setDoc: mockDb.setDoc,
      updateDoc: mockDb.updateDoc,
      deleteDoc: mockDb.deleteDoc,
      query: mockDb.query,
      where: mockDb.where,
      limit: mockDb.limit,
      addDoc: mockDb.addDoc
    };
  }
}

module.exports = dbExports;
