const express = require('express');
const PDFDocument = require('pdfkit');
const { Certificate } = require('../models/Certificate');
const { Attendance } = require('../models/Attendance');
const { Event } = require('../models/Event');
const { User } = require('../models/User');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

function generateCertificateId() {
  return 'CERT-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

// Generate certificates for all attendees of an event
router.post('/events/:eventId/generate', authRequired, requireRole(['faculty', 'hod', 'admin']), async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const attendance = await Attendance.find({ event: eventId, status: 'present' }).populate('student');

    const certificates = [];
    for (const record of attendance) {
      const existing = await Certificate.findOne({ event: eventId, student: record.student._id });
      if (existing) {
        certificates.push(existing);
        continue;
      }
      const cert = await Certificate.create({
        certificateId: generateCertificateId(),
        student: record.student._id,
        event: event._id,
        data: {
          studentName: record.student.name,
          eventTitle: event.title,
          department: record.student.department,
          date: event.startTime.toDateString(),
          organizedBy: event.department,
        },
      });
      certificates.push(cert);
    }

    res.json({ certificates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate certificates' });
  }
});

// List certificates for current student
router.get('/mine', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can access their certificates list' });
    }

    const certificates = await Certificate.find({ student: req.user.id })
      .populate('event', 'title startTime department');

    res.json({ certificates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load certificates' });
  }
});

// Get certificate metadata
router.get('/:certificateId', authRequired, async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate('student', 'name department')
      .populate('event', 'title startTime department');
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    res.json({ certificate: cert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

// Download certificate as simple PDF
router.get('/:certificateId/download', authRequired, async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate('student', 'name department')
      .populate('event', 'title startTime department');
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateId}.pdf"`);

    doc.fontSize(20).text('Participation Certificate', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`This is to certify that ${cert.data.studentName} of ${cert.data.department} department`, {
      align: 'left',
    });
    doc.text(`has participated in the event "${cert.data.eventTitle}" held on ${cert.data.date}.`);
    doc.moveDown();
    doc.text(`Organized by: ${cert.data.organizedBy}`);
    doc.moveDown(2);
    doc.text(`Certificate ID: ${cert.certificateId}`);

    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

module.exports = router;