import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'MySuperSecretKey2024';

app.use(cors());
app.use(bodyParser.json());

// --- Database Connection ---
const db = mysql.createConnection({
    host: 'boliw8r9sahjwiwa8lit-mysql.services.clever-cloud.com',
    user: 'uknffixcn0kjzv4i',     
    password: '4tbzzP1Ztr3j4yyTNV9i', 
    database: 'boliw8r9sahjwiwa8lit', 
    port: 3306,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

db.connect(err => {
    if (err) console.error('❌ Database connection failed:', err);
    else console.log('✅ Connected to MySQL Database');
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Helper: Logs ---
const logAction = (entityId, action, actor, details) => {
    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details) VALUES (?, ?, ?, ?)';
    db.query(sql, [entityId, action, actor, details], (err) => {
        if (err) console.error("Log Error:", err);
    });
};

// ================= ROUTES =================

// Auth
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0 || password !== results[0].password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = results[0];
        const token = jwt.sign({ id: user.id, username: user.username, fullname: user.fullname, role: user.role }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ token, user });
    });
});

app.post('/api/register', (req, res) => {
    const { username, password, fullname, role } = req.body;
    db.query('INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)', 
    [username, password, fullname, role || 'user'], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Registered' });
    });
});

// --- Projects ---

app.get('/api/projects', authenticateToken, (req, res) => {
    db.query('SELECT * FROM projects ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/projects', authenticateToken, (req, res) => {
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    // แปลงค่าว่าง
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = (budget === "" || budget === null) ? 0 : budget;

    const sql = 'INSERT INTO projects (code, name, description, owner, budget, status, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate], (err, result) => {
        if (err) return res.status(500).json(err);
        const newId = result.insertId;
        logAction(newId, 'CREATE', req.user.fullname, `สร้างโครงการ: ${name}`);
        res.json({ id: newId, ...req.body });
    });
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = (budget === "" || budget === null) ? 0 : budget;

    const sql = 'UPDATE projects SET code=?, name=?, description=?, owner=?, budget=?, status=?, startDate=?, endDate=? WHERE id=?';
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate, id], (err) => {
        if (err) return res.status(500).json(err);
        // บันทึก Log ว่ามีการแก้ไข
        logAction(id, 'UPDATE', req.user.fullname, `แก้ไขสถานะ/ข้อมูล: ${status}`);
        res.json({ message: 'Updated' });
    });
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM projects WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Deleted' });
    });
});

// --- 🔥 ส่วนที่เพิ่มใหม่สำหรับ Timeline (แก้ปัญหาเพิ่ม Note ไม่ได้) ---

// 1. ดึง Log ของโปรเจกต์เดียว (ใช้ใน Modal Timeline)
app.get('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC';
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. เพิ่ม Comment/Note ลงใน Timeline
app.post('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { note, action } = req.body; // รับค่า note จากหน้าบ้าน
    const actor = req.user.fullname;
    
    // action ถ้าไม่ส่งมาให้เป็น 'COMMENT'
    const logActionType = action || 'COMMENT'; 

    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details) VALUES (?, ?, ?, ?)';
    db.query(sql, [id, logActionType, actor, note], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Log added successfully' });
    });
});

// 3. แก้ไข Log (ถ้ามีฟีเจอร์นี้)
app.put('/api/logs/:logId', authenticateToken, (req, res) => {
    const { logId } = req.params;
    const { note } = req.body;
    db.query('UPDATE audit_logs SET details = ? WHERE id = ?', [note, logId], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Log updated' });
    });
});

// 4. ลบ Log
app.delete('/api/logs/:logId', authenticateToken, (req, res) => {
    const { logId } = req.params;
    db.query('DELETE FROM audit_logs WHERE id = ?', [logId], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Log deleted' });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});