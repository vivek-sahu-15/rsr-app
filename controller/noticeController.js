const db = require('../config/db');

// POST /api/notices  (teachers only)
// Body: { title, message }
async function createNotice(req, res) {
    try {
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

        if (!title || !message) {
            return res.status(400).json({ message: 'title and message are required' });
        }
        // Match the column sizes: title varchar(100), message varchar(500)
        if (title.length > 100) {
            return res.status(400).json({ message: 'title must be 100 characters or fewer' });
        }
        if (message.length > 500) {
            return res.status(400).json({ message: 'message must be 500 characters or fewer' });
        }

        // notices.teacher_id points to teachers.id, not users.id
        const [teacherRows] = await db.query(
            'SELECT id FROM teachers WHERE user_id = ?',
            [req.user.id]
        );

        if (teacherRows.length === 0) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }

        const [result] = await db.query(
            'INSERT INTO notices (teacher_id, title, message) VALUES (?, ?, ?)',
            [teacherRows[0].id, title, message]
        );

        return res.status(201).json({
            message: 'Notice posted',
            notice: { id: result.insertId, title, message }
        });

    } catch (error) {
        console.error('Create notice error:', error.message);
        return res.status(500).json({ message: 'Failed to post notice', error: error.message });
    }
}

// GET /api/notices  (both roles)
// Newest first, with the posting teacher's name joined in
async function getNotices(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT n.id, n.title, n.message, n.createdAt, t.fullName AS postedBy
             FROM notices n
             LEFT JOIN teachers t ON n.teacher_id = t.id
             ORDER BY n.createdAt DESC`
        );

        return res.json({ notices: rows });

    } catch (error) {
        console.error('Get notices error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch notices', error: error.message });
    }
}

module.exports = { createNotice, getNotices };