const db = require('../config/db')

async function getProfile(req, res) {
    try {
        const userId = req.user.id;
 
        const [rows] = await db.query(
            `SELECT s.id, s.fullName, s.contactNumber, s.admissionDate, s.dateOFBirth,
                    s.gender, s.course, s.semester, s.motherName, s.fatherName,
                    s.profilePicture, u.email
             FROM students s
             JOIN users u ON s.user_id = u.id
             WHERE s.user_id = ?`,
            [userId]
        );
 
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }
 
        return res.json({ profile: rows[0] });
 
    } catch (error) {
        console.error('Get profile error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
    }
}

async function getSyllabus(req, res) {
    try {
        const userId = req.user.id;

        // Step 1: find out which course/semester this student is in
        const [studentRows] = await db.query(
            `SELECT course, semester FROM students WHERE user_id = ?`,
            [userId]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const { course, semester } = studentRows[0];

        // Step 2: use those values to fetch the matching syllabus rows
        const [syllabusRows] = await db.query(
            `SELECT id, subject, content FROM syllabus WHERE course = ? AND semester = ?`,
            [course, semester]
        );

        // Empty array is fine here: the student exists, there's just no syllabus yet
        return res.json({ syllabus: syllabusRows });

    } catch (error) {
        console.error('Get syllabus error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch syllabus', error: error.message });
    }
}

async function getAttendance(req, res) {
    try {
        const userId = req.user.id;

        // Step 1: attendance.student_id points to students.id, not users.id
        const [studentRows] = await db.query(
            `SELECT id FROM students WHERE user_id = ?`,
            [userId]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const studentId = studentRows[0].id;

        // Step 2: per-subject totals
        const [rows] = await db.query(
            `SELECT subject,
                    COUNT(*) AS total,
                    SUM(status = 'present') AS present,
                    SUM(status = 'absent') AS absent
             FROM attendance
             WHERE student_id = ?
             GROUP BY subject`,
            [studentId]
        );

        // Step 3: SUM() comes back as a string from mysql2, so convert to numbers
        // and calculate each subject's percentage
        let overallTotal = 0;
        let overallPresent = 0;

        const subjects = rows.map((row) => {
            const total = Number(row.total);
            const present = Number(row.present);
            const absent = Number(row.absent);

            overallTotal += total;
            overallPresent += present;

            return {
                subject: row.subject,
                total,
                present,
                absent,
                percentage: total === 0 ? 0 : Number(((present / total) * 100).toFixed(1)),
            };
        });

        // Guard against dividing by zero when there are no records yet
        const overall = overallTotal === 0
            ? 0
            : Number(((overallPresent / overallTotal) * 100).toFixed(1));

        return res.json({ overall, subjects });

    } catch (error) {
        console.error('Get attendance error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
    }
}

async function updateProfilePicture(req, res) {
    try {
        const { url } = req.body;
 
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'url is required' });
        }
        // Loose sanity check — not a full URL validator, just guards against
        // someone accidentally sending garbage instead of a link
        if (!/^https?:\/\//.test(url)) {
            return res.status(400).json({ message: 'url must be a valid http(s) URL' });
        }
 
        const [result] = await db.query(
            'UPDATE students SET profilePicture = ? WHERE user_id = ?',
            [url, req.user.id]
        );
 
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }
 
        return res.json({ message: 'Profile picture updated', profilePicture: url });
 
    } catch (error) {
        console.error('Update profile picture error:', error.message);
        return res.status(500).json({ message: 'Failed to update profile picture', error: error.message });
    }
}

module.exports = { getProfile, getSyllabus, getAttendance, updateProfilePicture }