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
// 📌 2. Get Doctor's Appointments (With Patient Names)
router.get("/appointments/:doctorId", async (req, res) => {
  const doctorId = req.params.doctorId;

  try {
    const appointmentsSnapshot = await db.collection("appointments")
      .where("doctorId", "==", doctorId)
      .get();

    if (appointmentsSnapshot.empty) {
      return res.status(404).json({ error: "No appointments found" });
    }

    const appointments = [];
    const patientIds = new Set();

    appointmentsSnapshot.forEach(doc => {
      const data = doc.data();
      appointments.push({ id: doc.id, ...data });
      patientIds.add(data.patientId);
    });

    // Fetch Patient Names
    const patientDetails = {};
    const patientPromises = [...patientIds].map(async (patientId) => {
      const patientDoc = await db.collection("patients").doc(patientId).get();
      if (patientDoc.exists) {
        patientDetails[patientId] = patientDoc.data().name;
      }
    });

    await Promise.all(patientPromises);

    // Attach patient names to appointments
    const formattedAppointments = appointments.map(app => ({
      ...app,
      patientName: patientDetails[app.patientId] || "Unknown",
    }));

    res.status(200).json({ appointments: formattedAppointments });
  } catch (error) {
    console.error("Error fetching appointments:", error);
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
    console.error("Firestore Update Error:", error);
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
