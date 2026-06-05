const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
  createNotification,
} = require('../controllers/notificationsController');

// All routes require authentication
router.use(authenticate);

// Get user's notifications
router.get('/', getNotifications);

// Mark all as read
router.put('/read-all', markAllAsRead);

// Mark single as read
router.put('/:id/read', markAsRead);

// Delete single notification
router.delete('/clear', clearAll);

// Clear all notifications
router.delete('/:id', deleteNotification);

// Create notification (admin only)
router.post('/', authorize('ADMIN'), createNotification);

module.exports = router;
