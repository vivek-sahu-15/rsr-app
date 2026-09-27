const db = require('../config/db')

async function getProfile(req, res) {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT s.id, s.fullName, s.contactNumber, s.admissionDate, s.dateOFBirth,
                    s.gender, s.course, s.semester, s.motherName, s.fatherName,
                    u.email
             FROM students s
             JOIN users u ON s.user_id = u.id
             WHERE s.user_id = ?
            `, [userId])

        if (rows.length === 0) {
            return res.status(400).json({ message: "Student Profile not Found" })
        }

        return res.json({ profile: rows[0] })

    } catch (error) {
        console.error('Get profile error', error.message);
        return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });


    }

}

module.exports = { getProfile }