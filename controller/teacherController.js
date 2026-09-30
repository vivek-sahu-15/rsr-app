const db = require('../config/db');

const VALID_STATUSES = ['present', 'absent'];

// POST /api/teacher/attendance
// Body: { subject, date: 'YYYY-MM-DD', records: [{ studentId, status }, ...] }
async function markAttendance(req, res) {
    try {
        const { subject, date, records } = req.body;

        // 1. Validate input
        if (!subject || !date || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'subject, date and a non-empty records array are required' });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
        }

        for (const record of records) {
            if (!Number.isInteger(record.studentId)) {
                return res.status(400).json({ message: 'Each record needs a numeric studentId' });
            }
            if (!VALID_STATUSES.includes(record.status)) {
                return res.status(400).json({ message: 'status must be "present" or "absent"' });
            }
        }

        // 2. attendance.marked_by points to teachers.id, not users.id
        const [teacherRows] = await db.query(
            'SELECT id FROM teachers WHERE user_id = ?',
            [req.user.id]
        );

        if (teacherRows.length === 0) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }

        const teacherId = teacherRows[0].id;

        // 3. Build the array of rows for the bulk insert
        const rowsToInsert = records.map((r) => [r.studentId, subject, date, r.status, teacherId]);

        // 4. One query for all rows. ON DUPLICATE KEY UPDATE relies on the
        // unique key (student_id, subject, date), so re-submitting corrects
        // an existing record instead of failing or creating a duplicate.
        await db.query(
            `INSERT INTO attendance (student_id, subject, date, status, marked_by)
             VALUES ?
             ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)`,
            [rowsToInsert]
        );

        // Report records.length, not affectedRows (MySQL counts updated rows as 2)
        return res.status(201).json({
            message: 'Attendance marked successfully',
            saved: records.length
        });

    } catch (error) {
        // A studentId that doesn't exist in students breaks the foreign key
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'One or more studentIds do not exist' });
        }

        console.error('Mark attendance error:', error.message);
        return res.status(500).json({ message: 'Failed to mark attendance', error: error.message });
    }
}


const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EDITABLE_FIELDS = ['day', 'period', 'subject'];

// PUT /api/teacher/timetable/:id
// Body: any of { day, period, subject }. Only the fields sent are updated.
async function updateTimetableSlot(req, res) {
    try {
        const slotId = Number(req.params.id);
        if (!Number.isInteger(slotId)) {
            return res.status(400).json({ message: 'Invalid slot id' });
        }

        // Build the SET clause from only the fields that were actually sent
        const updates = {};
        for (const field of EDITABLE_FIELDS) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'Send at least one of: day, period, subject' });
        }

        if (updates.day !== undefined && !VALID_DAYS.includes(updates.day)) {
            return res.status(400).json({ message: 'day must be Monday to Saturday' });
        }

        // timetable.teacher_id points to teachers.id, not users.id
        const [teacherRows] = await db.query(
            'SELECT id FROM teachers WHERE user_id = ?',
            [req.user.id]
        );
        if (teacherRows.length === 0) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }
        const teacherId = teacherRows[0].id;

        // Ownership check: slot must exist and belong to this teacher
        const [slotRows] = await db.query(
            'SELECT id, teacher_id FROM timetable WHERE id = ?',
            [slotId]
        );
        if (slotRows.length === 0) {
            return res.status(404).json({ message: 'Timetable slot not found' });
        }
        if (slotRows[0].teacher_id !== teacherId) {
            return res.status(403).json({ message: 'You can only edit your own slots' });
        }

        const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
        await db.query(
            `UPDATE timetable SET ${setClause} WHERE id = ?`,
            [...Object.values(updates), slotId]
        );

        const [updated] = await db.query(
            'SELECT id, course, semester, day, period, subject FROM timetable WHERE id = ?',
            [slotId]
        );

        return res.json({ message: 'Timetable slot updated', slot: updated[0] });

    } catch (error) {
        console.error('Update timetable error:', error.message);
        return res.status(500).json({ message: 'Failed to update timetable', error: error.message });
    }
}


// GET /api/teacher/students?search=abc
// Lists students (with email from users). Optional name search.
async function getStudents(req, res) {
    try {
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

        // Build the query conditionally, but keep the value as a placeholder
        // even for LIKE so it can never be treated as SQL
        const params = [];
        let whereClause = '';
        if (search) {
            whereClause = 'WHERE s.fullName LIKE ?';
            params.push(`%${search}%`);
        }

        const [rows] = await db.query(
            `SELECT s.id, s.fullName, u.email, s.course, s.semester, s.contactNumber
             FROM students s
             JOIN users u ON s.user_id = u.id
             ${whereClause}
             ORDER BY s.fullName`,
            params
        );

        // s.id is the students.id: the value the attendance screen sends back as studentId
        return res.json({ students: rows });

    } catch (error) {
        console.error('Get students error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch students', error: error.message });
    }
}


async function getProfile(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT t.id, t.fullName, t.contactNumber, t.subject, t.profilePicture, u.email
             FROM teachers t
             JOIN users u ON t.user_id = u.id
             WHERE t.user_id = ?`,
            [req.user.id]
        );
 
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }
 
        return res.json({ profile: rows[0] });
 
    } catch (error) {
        console.error('Get teacher profile error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
    }
}


async function updateProfilePicture(req, res) {
    try {
        const { url } = req.body;
 
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'url is required' });
        }
        if (!/^https?:\/\//.test(url)) {
            return res.status(400).json({ message: 'url must be a valid http(s) URL' });
        }
 
        const [result] = await db.query(
            'UPDATE teachers SET profilePicture = ? WHERE user_id = ?',
            [url, req.user.id]
        );
 
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }
 
        return res.json({ message: 'Profile picture updated', profilePicture: url });
 
    } catch (error) {
        console.error('Update profile picture error:', error.message);
        return res.status(500).json({ message: 'Failed to update profile picture', error: error.message });
    }
}

module.exports = { markAttendance, updateTimetableSlot, getStudents, getProfile, updateProfilePicture };