const express = require('express')
const router = express.Router()
const {getProfile, getSyllabus, getAttendance, updateProfilePicture} = require('../controller/studentController')
const authMiddleware = require('../middleware/authMiddleware')
const {isStudent} = require('../middleware/roleMiddleware')

router.get('/profile', authMiddleware, isStudent, getProfile)
router.get('/syllabus', authMiddleware, isStudent, getSyllabus);
router.get('/attendance', authMiddleware, isStudent, getAttendance)
router.patch('/profile-picture', authMiddleware, isStudent, updateProfilePicture);



module.exports = router