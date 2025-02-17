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

// 📌 1. Get Doctor Profile
router.get("/profile/:id", async (req, res) => {
  const doctorId = req.params.id;

  try {
    const doctorDoc = await db.collection("doctors").doc(doctorId).get();
    if (!doctorDoc.exists) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    res.status(200).json(doctorDoc.data());
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📌 2. Get Doctor's Appointments
router.get("/appointments/:id", async (req, res) => {
  const doctorId = req.params.id;

  try {
    const appointmentsSnapshot = await db.collection("appointments")
      .where("doctorId", "==", doctorId)
      .get();

    const appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({ error: "Error fetching appointments" });
  }
});

router.put("/status/:id", async (req, res) => {
  const doctorId = req.params.id;
  const { available } = req.body;

  try {
    const doctorRef = db.collection("doctors").doc(doctorId);
    const doctorDoc = await doctorRef.get();

    if (!doctorDoc.exists) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    await doctorRef.update({ available });

    res.status(200).json({ message: "Doctor status updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error updating availability" });
  }
});

// 📌 4. Upload Patient Health Record
router.post("/upload-record", async (req, res) => {
  const { doctorId, patientId, diagnosis, prescription, notes } = req.body;

  // Validate input
  const validationError = validateInput(req.body, ["doctorId", "patientId", "diagnosis", "prescription", "notes"]);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const record = {
      doctorId,
      patientId,
      diagnosis,
      prescription,
      notes,
      createdAt: new Date(),
    };

    await db.collection("healthRecords").add(record);

    res.status(201).json({ message: "Health record uploaded successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error uploading health record" });
  }
});

// 📌 5. Update Appointment Status
router.put("/update-appointment/:appointmentId", async (req, res) => {
  const appointmentId = req.params.appointmentId;
  const { status } = req.body;

  // Validate input
  const validationError = validateInput(req.body, ["status"]);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    await db.collection("appointments").doc(appointmentId).update({ status });
    res.status(200).json({ message: "Appointment status updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error updating appointment status" });
  }
});

module.exports = router;
