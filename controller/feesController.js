const db = require('../config/db');

// GET /api/student/fees
async function getFees(req, res) {
    try {
        // fees.student_id points to students.id, not users.id
        const [studentRows] = await db.query(
            'SELECT id FROM students WHERE user_id = ?',
            [req.user.id]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const [fees] = await db.query(
            `SELECT id, amount, status, due_date
             FROM fees
             WHERE student_id = ?
             ORDER BY due_date`,
            [studentRows[0].id]
        );

        // Amounts can come back from MySQL as strings, so convert before adding
        let totalAmount = 0;
        let paid = 0;

        for (const fee of fees) {
            const amount = Number(fee.amount);
            totalAmount += amount;
            if (fee.status === 'paid') paid += amount;
        }

        return res.json({
            summary: { totalAmount, paid, pending: totalAmount - paid },
            fees
        });

    } catch (error) {
        console.error('Get fees error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch fees', error: error.message });
    }
}

module.exports = { getFees };