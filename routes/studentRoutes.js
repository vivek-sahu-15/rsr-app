const express = require('express')
const router = express.Router()
const {getProfile} = require('../controller/studentController')
const authMiddleware = require('../middleware/authMiddleware')
const {isStudent} = require('../middleware/roleMiddleware')

router.get('/profile', authMiddleware, isStudent, getProfile)

module.exports = router