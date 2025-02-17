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
// 📌 5. Get Patient's Health Records (With Doctor Name)
router.get("/health-records/:id", async (req, res) => {
  const patientId = req.params.id;

  try {
    const recordsSnapshot = await db.collection("healthRecords")
      .where("patientId", "==", patientId)
      .get();

    if (recordsSnapshot.empty) {
      return res.status(404).json({ error: "No health records found" });
    }

    const records = [];
    const doctorIds = new Set();

    recordsSnapshot.forEach(doc => {
      const data = doc.data();
      records.push({ id: doc.id, ...data });
      doctorIds.add(data.doctorId);
    });

    // Fetch Doctor Names
    const doctorDetails = {};
    const doctorPromises = [...doctorIds].map(async (doctorId) => {
      const doctorDoc = await db.collection("doctors").doc(doctorId).get();
      if (doctorDoc.exists) {
        doctorDetails[doctorId] = doctorDoc.data().name;
      }
    });

    await Promise.all(doctorPromises);

    // Attach doctor names to records
    const formattedRecords = records.map(record => ({
      ...record,
      doctorName: doctorDetails[record.doctorId] || "Unknown",
    }));

    res.status(200).json({ records: formattedRecords });
  } catch (error) {
    console.error("Error fetching health records:", error);
    res.status(500).json({ error: "Error fetching health records" });
  }
});

router.get("/available-slots/:doctorId/:date", async (req, res) => {
  const { doctorId, date } = req.params;

  try {
    // Define available slots (9 AM to 5 PM, 30-minute slots)
    const startTime = 9 * 60; // 9:00 AM in minutes
    const endTime = 17 * 60; // 5:00 PM in minutes
    const slotDuration = 30; // Each slot is 30 minutes

    let allSlots = [];
    for (let time = startTime; time < endTime; time += slotDuration) {
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      const slotTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      allSlots.push(slotTime);
    }

    // Fetch booked slots for the selected date
    const appointmentsSnapshot = await db.collection("appointments")
      .where("doctorId", "==", doctorId)
      .where("date", "==", date)
      .get();

    const bookedSlots = appointmentsSnapshot.docs.map(doc => doc.data().time);

    // Filter out booked slots
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

    res.status(200).json({ availableSlots });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Error fetching available slots" });
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
