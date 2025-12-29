const express = require('express');
const { Attendance } = require('../models/Attendance');
const { Event } = require('../models/Event');
const { User } = require('../models/User');
const { authRequired, requireRole } = require('../middleware/auth');
const { Parser } = require('json2csv');

const router = express.Router();

// Overview analytics for a given year (restricted to HOD/Admin)
router.get('/overview', authRequired, requireRole(['hod', 'admin']), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const turnout = await Attendance.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: '$event' },
      {
        $match: {
          'event.startTime': { $gte: start, $lt: end },
          status: 'present',
        },
      },
      {
        $group: {
          _id: '$event._id',
          title: { $first: '$event.title' },
          department: { $first: '$event.department' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const deptParticipation = await Attendance.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: '$event' },
      {
        $match: {
          'event.startTime': { $gte: start, $lt: end },
          status: 'present',
        },
      },
      {
        $group: {
          _id: '$student.department',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({ year, turnout, deptParticipation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// Annual report export as CSV (restricted to HOD/Admin)
router.get('/export', authRequired, requireRole(['hod', 'admin']), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const records = await Attendance.find({ status: 'present' })
      .populate('student')
      .populate('event');

    const filtered = records.filter((r) => r.event.startTime >= start && r.event.startTime < end);

    const rows = filtered.map((r) => ({
      year,
      eventTitle: r.event.title,
      department: r.event.department,
      eventDate: r.event.startTime.toISOString().slice(0, 10),
      studentName: r.student.name,
      studentRoll: r.student.rollNumber,
      studentDept: r.student.department,
      studentSemester: r.student.semester,
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="annual-report-${year}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export annual report' });
  }
});

module.exports = router;