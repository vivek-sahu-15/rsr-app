const express = require('express');
const router = express.Router();

const { markAttendance, updateTimetableSlot, getStudents, getProfile, updateProfilePicture } = require('../controller/teacherController');
const authMiddleware = require('../middleware/authMiddleware');
const { isTeacher } = require('../middleware/roleMiddleware');

router.post('/attendance', authMiddleware, isTeacher, markAttendance);
router.put('/timetable/:id', authMiddleware, isTeacher, updateTimetableSlot);
router.get('/students', authMiddleware, isTeacher, getStudents);
router.get('/profile', authMiddleware, isTeacher, getProfile);
router.patch('/profile-picture', authMiddleware, isTeacher, updateProfilePicture);

module.exports = router;