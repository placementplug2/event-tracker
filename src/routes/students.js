const express = require('express');
const { Event } = require('../models/Event');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Student profile helper
router.get('/me', authRequired, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can access this' });
  }
  res.json({
    id: req.user.id,
    role: req.user.role,
    department: req.user.department,
    semester: req.user.semester,
  });
});

// Relevant events proxy (for convenience)
router.get('/me/events', authRequired, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can access this' });
  }
  const { department, semester, id: studentId } = req.user;
  const now = new Date();
  const events = await Event.find({
    startTime: { $gte: now },
    $or: [
      { registeredStudents: studentId },
      {
        targetDepartments: { $in: [department] },
        $or: [
          { targetSemesters: { $size: 0 } },
          { targetSemesters: { $in: [semester] } },
        ],
      },
    ],
  }).sort({ startTime: 1 });

  res.json({ events });
});

module.exports = router;