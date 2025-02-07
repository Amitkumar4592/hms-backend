const express = require("express");
const admin = require("firebase-admin");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const router = express.Router();
const auth = getAuth();
const db = admin.firestore();

// ✅ Validate input function
const validateInput = (data, requiredFields) => {
  for (const field of requiredFields) {
    if (!data[field]) return `Missing required field: ${field}`;
  }
  return null;
};

// 📌 Register Patient API
router.post("/register", async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Validate input
  const validationError = validateInput(req.body, ["name", "email", "password", "phone"]);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Save patient details in Firestore
    await db.collection("patients").doc(userRecord.uid).set({
      name,
      email,
      phone,
      role: "PATIENT",
      createdAt: new Date(),
    });

    res.status(201).json({ message: "Patient registered successfully!", uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 📌 Login API (Admin, Doctor, Patient)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  const validationError = validateInput(req.body, ["email", "password"]);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    // Authenticate user with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user role from Firestore
    let role = null;
    let userData = null;

    const adminDoc = await db.collection("admins").doc(user.uid).get();
    const doctorDoc = await db.collection("doctors").doc(user.uid).get();
    const patientDoc = await db.collection("patients").doc(user.uid).get();

    if (adminDoc.exists) {
      role = "ADMIN";
      userData = adminDoc.data();
    } else if (doctorDoc.exists) {
      role = "DOCTOR";
      userData = doctorDoc.data();
    } else if (patientDoc.exists) {
      role = "PATIENT";
      userData = patientDoc.data();
    } else {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    res.status(200).json({ message: "Login successful", uid: user.uid, role, userData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 📌 Get User Profile API
router.post("/profile", async (req, res) => {
  const { uid, role } = req.body;

  // Validate input
  const validationError = validateInput(req.body, ["uid", "role"]);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const userDoc = await db.collection(role.toLowerCase() + "s").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(userDoc.data());
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
