const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    source: { type: String, enum: ['qr', 'manual'], default: 'qr' },
    scannedAt: { type: Date, default: Date.now },
    // Additional academic metadata for internal marks / hours
    hours: { type: Number, default: 0 }, // duration or credited hours
    category: {
      type: String,
      enum: ['academic', 'nss', 'club', 'other'],
      default: 'academic',
    },
    internalMarksWeight: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AttendanceSchema.index({ event: 1, student: 1 }, { unique: true });

module.exports = {
  Attendance: mongoose.model('Attendance', AttendanceSchema),
};