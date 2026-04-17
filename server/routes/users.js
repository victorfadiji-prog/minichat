const express = require('express');
const router = express.Router();
const { 
  searchUsers, 
  getUserById, 
  updateUser,
  getContacts,
  addContact,
  removeContact,
  findUserByEmail,
  addExternalContact,
  removeExternalContact
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

/**
 * User Routes — all protected
 */

// GET /api/users/search?q=query
router.get('/search', protect, searchUsers);

// GET /api/users/find?email=email
router.get('/find', protect, findUserByEmail);

// Contact Routes
router.get('/contacts', protect, getContacts);
router.post('/contacts/:id', protect, addContact);
router.delete('/contacts/:id', protect, removeContact);

// External/Manual Contact Routes
router.post('/external-contacts', protect, addExternalContact);
router.delete('/external-contacts/:email', protect, removeExternalContact);

// GET /api/users/:id
router.get('/:id', protect, getUserById);

// PUT /api/users/:id
router.put('/:id', protect, updateUser);

module.exports = router;
