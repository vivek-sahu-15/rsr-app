const express = require('express');
const router = express.Router();

const { getFees } = require('../controller/feesController');
const authMiddleware = require('../middleware/authMiddleware');
const { isStudent } = require('../middleware/roleMiddleware');

// Mounted at /api/student/fees in server.js, so '/' here is the full path
router.get('/', authMiddleware, isStudent, getFees);

module.exports = router;