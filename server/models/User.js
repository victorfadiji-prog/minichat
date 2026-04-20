const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Stores user credentials, profile info, and online status.
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    avatar: {
      type: String,
      default: '',
    },
    about: {
      type: String,
      default: 'Hey there! I am using MiniChat',
      maxlength: [150, 'About must be at most 150 characters'],
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    externalContacts: [
      {
        email: { type: String, required: true },
        name: { type: String, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    notificationSettings: {
      enabled: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      showPreview: { type: Boolean, default: true },
    },
    customRingtone: {
      url: { type: String, default: '' },
      name: { type: String, default: '' },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Index for searching users
userSchema.index({ username: 'text', email: 'text' });

/**
 * Pre-save hook: hash password before storing.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Compare entered password with hashed password in DB.
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Return user object without sensitive fields.
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
