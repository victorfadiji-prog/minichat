const express = require('express');
const router = express.Router();
const { sendMessage, reactToMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

/**
 * Message Routes — all protected
 */

// POST /api/messages
router.post('/', protect, sendMessage);

// POST /api/messages/:id/react
router.post('/:id/react', protect, reactToMessage);

// PUT /api/messages/:id
router.put('/:id', protect, require('../controllers/messageController').editMessage);

// DELETE /api/messages/:id
router.delete('/:id', protect, require('../controllers/messageController').deleteMessage);

module.exports = router;
