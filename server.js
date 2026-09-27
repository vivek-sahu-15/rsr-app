const db = require('./config/db')
const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/authRoutes')
const studentRoutes = require('./routes/studentRoutes')
const PORT = 5050

const app = express()

app.use(cors());
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/student', studentRoutes)


app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1')
        res.json({ status: 'OK', db: 'connected' })
    } catch (error) {
        res.status(500).json({ status: 'error', db: 'disconnected' });
    }
})

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
})

