const express = require('express');
const { Event } = require('../models/Event');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
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

    const grouped = events.reduce((acc, ev) => {
      const key = ev.startTime.toISOString().slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
      return acc;
    }, {});

    res.json({ calendar: grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load calendar' });
  }
});

module.exports = router;