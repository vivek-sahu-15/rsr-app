// Usage: router.get('/route', authMiddleware, isTeacher, handler)
// Must run AFTER authMiddleware, since it relies on req.user being set.

function isStudent(req, res, next) {
    if (req.user.role !== 'student') {
        return res.status(403).json({ message: 'Students only' });
    }
    next();
}

function isTeacher(req, res, next) {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Teachers only' });
    }
    next();
}

module.exports = { isStudent, isTeacher };