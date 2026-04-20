const User = require('../models/User');

/**
 * GET /api/users/search?q=query
 * Search users by username or email.
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    // Search by username or email (case-insensitive)
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        },
      ],
    })
      .select('username email avatar status lastSeen about')
      .limit(20);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching users',
    });
  }
};

/**
 * GET /api/users/:id
 * Get a specific user's profile.
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'username email avatar status lastSeen about'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * PUT /api/users/:id
 * Update user profile.
 */
exports.updateUser = async (req, res) => {
  try {
    // Only allow updating own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      });
    }

    const allowedFields = ['username', 'about', 'avatar', 'notificationSettings', 'customRingtone'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
    });
  }
};

/**
 * GET /api/users/contacts
 * Get current user's contact list.
 */
exports.getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'contacts',
      'username email avatar status lastSeen about'
    );

    res.status(200).json({
      success: true,
      contacts: user.contacts,
      externalContacts: user.externalContacts || [],
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contacts',
    });
  }
};

/**
 * POST /api/users/contacts/:id
 * Add a user to contacts.
 */
exports.addContact = async (req, res) => {
  try {
    const contactId = req.params.id;

    if (contactId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself to contacts',
      });
    }

    const user = await User.findById(req.user._id);

    if (user.contacts.includes(contactId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already in your contacts',
      });
    }

    user.contacts.push(contactId);
    await user.save();

    const populatedUser = await User.findById(req.user._id).populate(
      'contacts',
      'username email avatar status lastSeen about'
    );

    res.status(200).json({
      success: true,
      contacts: populatedUser.contacts,
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding contact',
    });
  }
};

/**
 * DELETE /api/users/contacts/:id
 * Remove a user from contacts.
 */
exports.removeContact = async (req, res) => {
  try {
    const contactId = req.params.id;
    const user = await User.findById(req.user._id);

    user.contacts = user.contacts.filter(
      (id) => id.toString() !== contactId
    );
    await user.save();

    const populatedUser = await User.findById(req.user._id).populate(
      'contacts',
      'username email avatar status lastSeen about'
    );

    res.status(200).json({
      success: true,
      contacts: populatedUser.contacts,
    });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing contact',
    });
  }
};

/**
 * GET /api/users/find?email=email
 * Find user by exact email.
 */
exports.findUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('username email avatar status lastSeen about');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Find user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/users/external-contacts
 * Add manual (external) contact.
 */
exports.addExternalContact = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Email and name are required' });
    }

    const user = await User.findById(req.user._id);

    // Check if already in external contacts
    if (user.externalContacts.some(c => c.email === email.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Contact already exists' });
    }

    user.externalContacts.push({ email: email.toLowerCase(), name });
    await user.save();

    res.status(200).json({
      success: true,
      externalContacts: user.externalContacts,
    });
  } catch (error) {
    console.error('Add external contact error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/users/external-contacts/:email
 * Remove manual contact.
 */
exports.removeExternalContact = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findById(req.user._id);

    user.externalContacts = user.externalContacts.filter(c => c.email !== email);
    await user.save();

    res.status(200).json({
      success: true,
      externalContacts: user.externalContacts,
    });
  } catch (error) {
    console.error('Remove external contact error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
