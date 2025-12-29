const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    semester: { type: Number },
    title: { type: String, required: true },
    body: { type: String },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    type: {
      type: String,
      enum: ['reminder', 'exam', 'registration', 'general'],
      default: 'general',
    },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = {
  Notification: mongoose.model('Notification', NotificationSchema),
};