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

// 📌 1. Get Patient Profile
router.get("/profile/:id", async (req, res) => {
  const patientId = req.params.id;

  try {
    const patientDoc = await db.collection("patients").doc(patientId).get();
    if (!patientDoc.exists) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.status(200).json(patientDoc.data());
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📌 2. Search Doctors by Specialization
router.get("/doctors", async (req, res) => {
  const { specialization, page = 1, limit = 10 } = req.query;

  try {
    let query = db.collection("doctors");
    if (specialization) {
      query = query.where("specialization", "==", specialization);
    }

    const doctorsSnapshot = await query.offset((page - 1) * limit).limit(Number(limit)).get();
    const doctors = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ doctors });
  } catch (error) {
    res.status(500).json({ error: "Error fetching doctors" });
  }
});

// 📌 3. Book an Appointment
router.post("/book-appointment", async (req, res) => {
  const { patientId, doctorId, date, time } = req.body;

  // Validate input
  const validationError = validateInput(req.body, ["patientId", "doctorId", "date", "time"]);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const appointment = {
      patientId,
      doctorId,
      date,
      time,
      status: "Scheduled",
      createdAt: new Date(),
    };

    await db.collection("appointments").add(appointment);

    res.status(201).json({ message: "Appointment booked successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error booking appointment" });
  }
});

// 📌 4. Get Patient's Appointments
router.get("/appointments/:id", async (req, res) => {
  const patientId = req.params.id;

  try {
    const appointmentsSnapshot = await db.collection("appointments")
      .where("patientId", "==", patientId)
      .get();

    const appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({ error: "Error fetching appointments" });
  }
});

// 📌 5. Get Patient's Health Records
router.get("/health-records/:id", async (req, res) => {
  const patientId = req.params.id;

  try {
    const recordsSnapshot = await db.collection("healthRecords")
      .where("patientId", "==", patientId)
      .get();

    const records = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ records });
  } catch (error) {
    res.status(500).json({ error: "Error fetching health records" });
  }
});

// 📌 6. Cancel Appointment
router.delete("/cancel-appointment/:appointmentId", async (req, res) => {
  const appointmentId = req.params.appointmentId;

  try {
    await db.collection("appointments").doc(appointmentId).delete();
    res.status(200).json({ message: "Appointment canceled successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error canceling appointment" });
  }
});

// 📌 7. Get Available Doctors by Specialization
router.get("/available-doctors", async (req, res) => {
  const { specialization, page = 1, limit = 10 } = req.query;

  try {
    let query = db.collection("doctors").where("available", "==", true);
    if (specialization) {
      query = query.where("specialization", "==", specialization);
    }

    const doctorsSnapshot = await query.offset((page - 1) * limit).limit(Number(limit)).get();
    const doctors = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ doctors });
  } catch (error) {
    res.status(500).json({ error: "Error fetching available doctors" });
  }
});

module.exports = router;
