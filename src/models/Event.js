const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    department: { type: String, required: true },
    type: {
      type: String,
      enum: ['seminar', 'workshop', 'circular', 'internal', 'deadline', 'exam'],
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    location: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isAcademic: { type: Boolean, default: true },
    targetDepartments: [{ type: String }],
    targetSemesters: [{ type: Number }],
    registeredStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = {
  Event: mongoose.model('Event', EventSchema),
};