const express = require("express");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

// ✅ Validate input function
const validateInput = (data, requiredFields) => {
  for (const field of requiredFields) {
    if (!data[field]) return `Missing required field: ${field}`;
  }
  return null;
};

// 📌 1. Add a New Doctor
router.post("/add-doctor", async (req, res) => {
  const { name, email, password, specialization, phone } = req.body;

  // Validate input
  const validationError = validateInput(req.body, ["name", "email", "password", "specialization", "phone"]);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    // Create doctor in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Store doctor details in Firestore
    await db.collection("doctors").doc(userRecord.uid).set({
      name,
      email,
      specialization,
      phone,
      role: "DOCTOR",
      available: true, // Default availability
      createdAt: new Date(),
    });

    res.status(201).json({ message: "Doctor added successfully!", uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 📌 2. Update Doctor Details
router.put("/update-doctor/:id", async (req, res) => {
  const doctorId = req.params.id;
  const updatedData = req.body;

  try {
    const doctorRef = db.collection("doctors").doc(doctorId);
    const doctorDoc = await doctorRef.get();

    if (!doctorDoc.exists) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    await doctorRef.update(updatedData);
    res.status(200).json({ message: "Doctor details updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📌 3. Delete a Doctor
router.delete("/delete-doctor/:id", async (req, res) => {
  const doctorId = req.params.id;

  try {
    // Delete from Firebase Authentication
    await admin.auth().deleteUser(doctorId);

    // Delete from Firestore
    await db.collection("doctors").doc(doctorId).delete();

    res.status(200).json({ message: "Doctor deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting doctor" });
  }
});

// 📌 4. Get All Registered Patients
router.get("/patients", async (req, res) => {
  try {
    const patientsSnapshot = await db.collection("patients").get();
    const patients = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ patients });
  } catch (error) {
    res.status(500).json({ error: "Error fetching patients" });
  }
});

// 📌 5. Get All Appointments (With Pagination)
router.get("/all-appointments", async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const appointmentsSnapshot = await db.collection("appointments")
      .offset((page - 1) * limit)
      .limit(Number(limit))
      .get();

    const appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({ error: "Error fetching appointments" });
  }
});

// 📌 6. Get All Registered Doctors
router.get("/doctors", async (req, res) => {
  try {
    const doctorsSnapshot = await db.collection("doctors").get();
    const doctors = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ doctors });
  } catch (error) {
    res.status(500).json({ error: "Error fetching doctors" });
  }
});

module.exports = router;
