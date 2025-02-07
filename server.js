require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const firebase = require("firebase/app");
require("firebase/auth");

// Initialize Express App
const app = express();
app.use(express.json());
app.use(cors());

// Load Firebase Admin SDK for backend operations (Firestore, Auth Management)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  });


// Firebase Client SDK (for user authentication)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Ensure Firebase initializes only once
if (!firebase.getApps().length) {
  firebase.initializeApp(firebaseConfig);
}

// 🔥 Import API Routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const patientRoutes = require("./routes/patientRoutes");

app.use("/api/auth", authRoutes);     // Authentication APIs
app.use("/api/admin", adminRoutes);   // Admin APIs
app.use("/api/doctor", doctorRoutes); // Doctor APIs
app.use("/api/patient", patientRoutes); // Patient APIs

// 🏥 Test API Endpoint
app.get("/", (req, res) => {
  res.send("✅ Hospital Management System API is running...");
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
