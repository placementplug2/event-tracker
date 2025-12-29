const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    issuedAt: { type: Date, default: Date.now },
    data: {
      studentName: String,
      eventTitle: String,
      department: String,
      date: String,
      organizedBy: String,
    },
  },
  { timestamps: true }
);

module.exports = {
  Certificate: mongoose.model('Certificate', CertificateSchema),
};