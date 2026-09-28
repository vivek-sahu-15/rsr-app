const db = require('../config/db');

// Sorts Monday..Saturday properly instead of alphabetically
const ORDER_CLAUSE = `ORDER BY FIELD(t.day, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), t.period`;

// GET /api/timetable
// Students see their course/semester timetable; teachers see their own slots.
async function getTimetable(req, res) {
    try {
        const { id: userId, role } = req.user;
        let rows;

        if (role === 'student') {
            const [studentRows] = await db.query(
                'SELECT course, semester FROM students WHERE user_id = ?',
                [userId]
            );

            if (studentRows.length === 0) {
                return res.status(404).json({ message: 'Student profile not found' });
            }

            const { course, semester } = studentRows[0];

            [rows] = await db.query(
                `SELECT t.id, t.day, t.period, t.subject, te.fullName AS teacherName
                 FROM timetable t
                 LEFT JOIN teachers te ON t.teacher_id = te.id
                 WHERE t.course = ? AND t.semester = ?
                 ${ORDER_CLAUSE}`,
                [course, semester]
            );

        } else if (role === 'teacher') {
            // timetable.teacher_id points to teachers.id, not users.id
            const [teacherRows] = await db.query(
                'SELECT id FROM teachers WHERE user_id = ?',
                [userId]
            );

            if (teacherRows.length === 0) {
                return res.status(404).json({ message: 'Teacher profile not found' });
            }

            [rows] = await db.query(
                `SELECT t.id, t.day, t.period, t.subject, t.course, t.semester
                 FROM timetable t
                 WHERE t.teacher_id = ?
                 ${ORDER_CLAUSE}`,
                [teacherRows[0].id]
            );

        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Empty array is fine: user exists, there are just no slots yet
        return res.json({ timetable: rows });

    } catch (error) {
        console.error('Get timetable error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch timetable', error: error.message });
    }
}

module.exports = { getTimetable };