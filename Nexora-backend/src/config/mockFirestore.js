const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "../../db.json");

const loadDb = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      console.log("Loading DB from:", DB_FILE);
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading mock DB file:", err);
  }
  return {
    users: {},
    plans: {},
    sessions: {},
    transactions: {},
    blacklistedTokens: {}
  };
};

const saveDb = (data) => {
  try {
    console.log("Saving DB to:", DB_FILE);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving mock DB file:", err);
  }
};

const db = { type: "mock-db" };

const doc = (dbRef, collectionName, docId) => {
  return {
    type: "doc",
    collectionName,
    id: docId || Math.random().toString(36).substring(2, 15)
  };
};

const collection = (dbRef, collectionName) => {
  return {
    type: "collection",
    collectionName
  };
};

const getDoc = async (docRef) => {
  const dbData = loadDb();
  const col = dbData[docRef.collectionName] || {};
  const data = col[docRef.id];
  return {
    id: docRef.id,
    exists: () => data !== undefined,
    data: () => (data ? { ...data } : undefined)
  };
};

const getDocs = async (queryRef) => {
  const dbData = loadDb();
  let collectionName = "";
  let constraints = [];

  if (queryRef.type === "collection") {
    collectionName = queryRef.collectionName;
  } else if (queryRef.type === "query") {
    collectionName = queryRef.collectionRef.collectionName;
    constraints = queryRef.constraints;
  }

  const col = dbData[collectionName] || {};
  let docs = Object.keys(col).map(id => ({
    id,
    data: () => ({ ...col[id] })
  }));

  // Apply where constraints
  for (const c of constraints) {
    if (c.type === "where") {
      const { field, op, value } = c;
      docs = docs.filter(docObj => {
        const docData = docObj.data();
        const docVal = docData[field];

        if (op === "==") {
          if (typeof docVal === "string" && typeof value === "string") {
            return docVal.toLowerCase() === value.toLowerCase();
          }
          return docVal === value;
        }
        if (op === "<") return docVal < value;
        if (op === ">") return docVal > value;
        if (op === "<=") return docVal <= value;
        if (op === ">=") return docVal >= value;
        return true;
      });
    }
  }

  // Apply limit
  const limitConstraint = constraints.find(c => c.type === "limit");
  if (limitConstraint) {
    docs = docs.slice(0, limitConstraint.value);
  }

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (callback) => {
      docs.forEach(callback);
    }
  };
};

const setDoc = async (docRef, data) => {
  const dbData = loadDb();
  if (!dbData[docRef.collectionName]) dbData[docRef.collectionName] = {};
  dbData[docRef.collectionName][docRef.id] = { ...data };
  saveDb(dbData);
};

const updateDoc = async (docRef, updateData) => {
  const dbData = loadDb();
  if (!dbData[docRef.collectionName]) dbData[docRef.collectionName] = {};
  const current = dbData[docRef.collectionName][docRef.id] || {};
  dbData[docRef.collectionName][docRef.id] = { ...current, ...updateData };
  saveDb(dbData);
};

const deleteDoc = async (docRef) => {
  const dbData = loadDb();
  if (dbData[docRef.collectionName] && dbData[docRef.collectionName][docRef.id]) {
    delete dbData[docRef.collectionName][docRef.id];
    saveDb(dbData);
  }
};

const query = (collectionRef, ...constraints) => {
  return {
    type: "query",
    collectionRef,
    constraints
  };
};

const where = (field, op, value) => {
  return {
    type: "where",
    field,
    op,
    value
  };
};

const limit = (value) => {
  return {
    type: "limit",
    value
  };
};

const addDoc = async (collectionRef, data) => {
  const id = Math.random().toString(36).substring(2, 15);
  const docRef = doc(null, collectionRef.collectionName, id);
  await setDoc(docRef, data);
  return docRef;
};

module.exports = {
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
