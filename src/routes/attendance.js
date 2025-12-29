const express = require('express');
const { Attendance } = require('../models/Attendance');
const { Event } = require('../models/Event');
const { User } = require('../models/User');
const { authRequired, requireRole } = require('../middleware/auth');
const { parseQrPayload } = require('../utils/qr');

const router = express.Router();

// Mark attendance from QR payload
router.post('/mark-from-qr', authRequired, requireRole(['faculty', 'hod', 'admin']), async (req, res) => {
  try {
    const { payload } = req.body;
    const parsed = parseQrPayload(payload);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid QR payload' });
    }

    const { eventId, studentId } = parsed;
    const event = await Event.findById(eventId);
    const student = await User.findById(studentId);
    if (!event || !student) {
      return res.status(404).json({ error: 'Event or student not found' });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { event: eventId, student: studentId },
      { status: 'present', source: 'qr', scannedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// List attendance for an event
router.get('/event/:eventId', authRequired, requireRole(['faculty', 'hod', 'admin']), async (req, res) => {
  try {
    const records = await Attendance.find({ event: req.params.eventId }).populate(
      'student',
      'name email department semester rollNumber'
    );
    res.json({ attendance: records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Update academic metadata (hours / category / internal marks) for an attendance record
router.put('/:id/meta', authRequired, requireRole(['faculty', 'hod', 'admin']), async (req, res) => {
  try {
    const { hours, category, internalMarksWeight } = req.body;
    const update = {};
    if (hours !== undefined) update.hours = hours;
    if (category) update.category = category;
    if (internalMarksWeight !== undefined) update.internalMarksWeight = internalMarksWeight;

    const record = await Attendance.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ attendance: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update attendance metadata' });
  }
});

module.exports = router;
