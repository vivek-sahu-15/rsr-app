const bcrypt = require('bcrypt');
const db = require('../config/db');
const generateToken = require('../utils/generateToken');

const SALT_ROUNDS = 10;

// POST /api/auth/signup
// Creates a row in `users`, then a matching row in `students` or `teachers`
// using the new user's id — wrapped in a transaction so we never end up
// with a user that has no profile (or vice versa) if something fails.
async function signup(req, res) {
    const { email, password, role, ...profile } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'email, password and role are required' });
    }
    if (role !== 'student' && role !== 'teacher') {
        return res.status(400).json({ message: 'role must be "student" or "teacher"' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const [userResult] = await connection.query(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [email, hashedPassword, role]
        );
        const userId = userResult.insertId;

        if (role === 'student') {
            await connection.query(
                `INSERT INTO students
                 (user_id, fullName, contactNumber, admissionDate, dateOFBirth, gender, course, semester, motherName, fatherName)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    profile.fullName || null,
                    profile.contactNumber || null,
                    profile.admissionDate || null,
                    profile.dateOFBirth || null,
                    profile.gender || null,
                    profile.course || null,
                    profile.semester || null,
                    profile.motherName || null,
                    profile.fatherName || null,
                ]
            );
        } else {
            await connection.query(
                `INSERT INTO teachers (user_id, fullName, contactNumber, subject)
                 VALUES (?, ?, ?, ?)`,
                [userId, profile.fullName || null, profile.contactNumber || null, profile.subject || null]
            );
        }

        await connection.commit();

        const token = generateToken({ id: userId, role });
        return res.status(201).json({ message: 'Signup successful', token, user: { id: userId, email, role } });

    } catch (error) {
        await connection.rollback();
        console.error('Signup error:', error.message);
        return res.status(500).json({ message: 'Signup failed', error: error.message });
    } finally {
        connection.release();
    }
}

// POST /api/auth/login
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'email and password are required' });
    }

    try {
        const [rows] = await db.query('SELECT id, email, password, role FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = rows[0];
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = generateToken(user);
        return res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ message: 'Login failed', error: error.message });
    }
}

module.exports = { signup, login };