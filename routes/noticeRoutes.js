const express = require('express');
const router = express.Router();

const { createNotice, getNotices } = require('../controller/noticeController');
const authMiddleware = require('../middleware/authMiddleware');
const { isTeacher } = require('../middleware/roleMiddleware');

// Both roles can read; only teachers can post
router.get('/', authMiddleware, getNotices);
router.post('/', authMiddleware, isTeacher, createNotice);

module.exports = router;