const express = require('express');
const router = express.Router();

const { markAttendance, updateTimetableSlot, getStudents } = require('../controller/teacherController');
const authMiddleware = require('../middleware/authMiddleware');
const { isTeacher } = require('../middleware/roleMiddleware');

router.post('/attendance', authMiddleware, isTeacher, markAttendance);
router.put('/timetable/:id', authMiddleware, isTeacher, updateTimetableSlot);
router.get('/students', authMiddleware, isTeacher, getStudents);

module.exports = router;