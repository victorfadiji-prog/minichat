const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const { protect } = require('../middleware/auth');

/**
 * @desc    Get user's call history
 * @route   GET /api/calls
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const calls = await Call.find({ participants: req.user.id })
      .populate('participants', 'username avatar')
      .populate('caller', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      calls,
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @desc    Get a single call record
 * @route   GET /api/calls/:id
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id)
      .populate('participants', 'username avatar')
      .populate('caller', 'username avatar');

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    // Check if user was a participant
    if (!call.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({
      success: true,
      call,
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @desc    Create a call record (initially ongoing)
 * @route   POST /api/calls
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { participants, type, conversation, isGroup } = req.body;

    const call = await Call.create({
      participants: [...new Set([...participants, req.user.id])],
      caller: req.user.id,
      type: type || 'audio',
      conversation,
      isGroup: isGroup || false,
      status: 'ongoing',
      startedAt: new Date(),
    });

    const populatedCall = await Call.findById(call._id)
      .populate('participants', 'username avatar')
      .populate('caller', 'username avatar');

    res.status(201).json({
      success: true,
      call: populatedCall,
    });
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @desc    Update call status/duration (when ended)
 * @route   PUT /api/calls/:id
 * @access  Private
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const { status, duration } = req.body;
    
    const call = await Call.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    if (status) call.status = status;
    if (duration !== undefined) call.duration = duration;
    call.endedAt = new Date();

    await call.save();

    res.json({
      success: true,
      call,
    });
  } catch (error) {
    console.error('Error updating call:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
