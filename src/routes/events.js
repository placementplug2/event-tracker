const express = require('express');
const { Event } = require('../models/Event');
const { Attendance } = require('../models/Attendance');
const { Notification } = require('../models/Notification');
const { authRequired, requireRole } = require('../middleware/auth');
const { buildQrPayload } = require('../utils/qr');

const router = express.Router();

// Create event (faculty/HOD)
router.post('/', authRequired, requireRole(['faculty', 'hod', 'admin']), async (req, res) => {
  try {
    const {
      title,
      description,
      department,
      type,
      startTime,
      endTime,
      location,
      targetDepartments,
      targetSemesters,
      isAcademic,
    } = req.body;

    if (!title || !department || !type || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Stronger role separation: certain event types require HOD or admin
    const restrictedForFaculty = ['exam', 'deadline'];
    if (req.user.role === 'faculty' && restrictedForFaculty.includes(type)) {
      return res.status(403).json({ error: 'Only HOD or admin can create exam/deadline events' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check for clashes within same department
    const clashes = await Event.find({
      department,
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    const event = await Event.create({
      title,
      description,
      department,
      type,
      startTime: start,
      endTime: end,
      location,
      isAcademic: isAcademic !== false,
      targetDepartments: targetDepartments && targetDepartments.length ? targetDepartments : [department],
      targetSemesters: targetSemesters || [],
      createdBy: req.user.id,
    });

    // Create notifications for matching students (department/semester-wide)
    if (event.targetDepartments?.length) {
      const semesterForNotif = Array.isArray(event.targetSemesters) && event.targetSemesters.length === 1
        ? event.targetSemesters[0]
        : null;

      await Notification.create({
        department: department,
        semester: semesterForNotif,
        title: `New ${type} scheduled: ${title}`,
        body: description || '',
        event: event._id,
        type: type === 'exam' ? 'exam' : 'general',
      });
    }

    res.status(201).json({ event, clashes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// List events (optionally filtered)
router.get('/', authRequired, async (req, res) => {
  try {
    const { department, type, from, to } = req.query;
    const query = {};
    if (department) query.department = department;
    if (type) query.type = type;
    if (from || to) {
      query.startTime = {};
      if (from) query.startTime.$gte = new Date(from);
      if (to) query.startTime.$lte = new Date(to);
    }

    const events = await Event.find(query).sort({ startTime: 1 });
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/:id', authRequired, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Update event
router.put('/:id', authRequired, requireRole(['faculty', 'hod', 'admin']), async (req, res) => {
  try {
    const update = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Stronger role separation: faculty cannot change event into restricted types
    const restrictedForFaculty = ['exam', 'deadline'];
    const targetType = update.type || event.type;
    if (req.user.role === 'faculty' && restrictedForFaculty.includes(targetType)) {
      return res.status(403).json({ error: 'Only HOD or admin can manage exam/deadline events' });
    }

    if (update.startTime || update.endTime || update.department) {
      const department = update.department || event.department;
      const start = new Date(update.startTime || event.startTime);
      const end = new Date(update.endTime || event.endTime);

      const clashes = await Event.find({
        _id: { $ne: event._id },
        department,
        startTime: { $lt: end },
        endTime: { $gt: start },
      });

      const updated = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
      return res.json({ event: updated, clashes });
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ event: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', authRequired, requireRole(['faculty', 'hod', 'admin']), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const restrictedForFaculty = ['exam', 'deadline'];
    if (req.user.role === 'faculty' && restrictedForFaculty.includes(event.type)) {
      return res.status(403).json({ error: 'Only HOD or admin can delete exam/deadline events' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Register student for event
router.post('/:id/register', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can register' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    let newlyRegistered = false;
    if (!event.registeredStudents.includes(req.user.id)) {
      event.registeredStudents.push(req.user.id);
      await event.save();
      newlyRegistered = true;
    }

    // Student-specific notification for registered event
    if (newlyRegistered) {
      await Notification.create({
        student: req.user.id,
        department: event.department,
        title: `Registered for ${event.title}`,
        body: `You have successfully registered for ${event.title}.`,
        event: event._id,
        type: 'registration',
      });
    }

    res.json({ event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// Relevant events for current student
router.get('/student/me/relevant', authRequired, async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch relevant events' });
  }
});

// Get QR payload for a student and event
router.get('/:id/qr-payload', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can get QR payloads for attendance' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const payload = buildQrPayload(event._id.toString(), req.user.id);
    res.json({ payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate QR payload' });
  }
});

// Calendar endpoint
router.get('/calendar/all', authRequired, async (req, res) => {
  try {
    const { department, semester, from, to } = req.query;
    const query = {};
    if (department) query.department = department;
    if (from || to) {
      query.startTime = {};
      if (from) query.startTime.$gte = new Date(from);
      if (to) query.startTime.$lte = new Date(to);
    }

    const events = await Event.find(query).sort({ startTime: 1 });
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load calendar' });
  }
});

module.exports = router;