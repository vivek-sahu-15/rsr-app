const express = require('express');
const router = express.Router();

const { signup, login } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);

// Quick way to test that authMiddleware + JWT are working end-to-end.
// Send a request here with Authorization: Bearer <token> and confirm
// it echoes back the decoded user instead of a 401.
router.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;