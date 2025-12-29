const express = require('express');
const { Notification } = require('../models/Notification');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Notifications for current student
router.get('/me', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can access this' });
    }

    const notifications = await Notification.find({
      $or: [
        // Direct, per-student notifications (e.g., for registrations)
        { student: req.user.id },
        // Broadcast notifications scoped to department and (optionally) semester
        {
          student: null,
          department: req.user.department,
          $or: [
            { semester: null },
            { semester: { $exists: false } },
            { semester: req.user.semester },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// Mark notification as seen
router.post('/:id/seen', authRequired, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { seen: true },
      { new: true }
    );
    res.json({ notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;