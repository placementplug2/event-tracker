const mongoose = require('mongoose');

const USER_ROLES = ['student', 'faculty', 'hod', 'admin'];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    department: { type: String },
    semester: { type: Number, min: 1, max: 12 },
    rollNumber: { type: String },
    designation: { type: String }
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model('User', UserSchema),
  USER_ROLES,
};