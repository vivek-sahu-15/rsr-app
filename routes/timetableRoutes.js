const express = require('express');
const router = express.Router();

const { getTimetable } = require('../controller/timetableController');
const authMiddleware = require('../middleware/authMiddleware');

// No role middleware here: both students and teachers can view a timetable.
// The controller decides what each role sees.
router.get('/', authMiddleware, getTimetable);

module.exports = router;