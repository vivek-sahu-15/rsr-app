const express = require('express')
const router = express.Router()
const {getProfile, getSyllabus, getAttendance} = require('../controller/studentController')
const authMiddleware = require('../middleware/authMiddleware')
const {isStudent} = require('../middleware/roleMiddleware')

router.get('/profile', authMiddleware, isStudent, getProfile)
router.get('/syllabus', authMiddleware, isStudent, getSyllabus);
router.get('/attendance', authMiddleware, isStudent, getAttendance)


module.exports = router