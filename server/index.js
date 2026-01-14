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

// --- 1. การเชื่อมต่อฐานข้อมูล (Database Connection) ---
const db = mysql.createConnection({
    host: 'boliw8r9sahjwiwa8lit-mysql.services.clever-cloud.com', // เอามาจากรูปที่คุณส่งล่าสุด
    user: 'uknffixcn0kjzv4i', // ⚠️ เช็คใน Clever Cloud อีกทีนะครับว่า User นี้สำหรับ DB ใหม่นี้ใช่ไหม
    password: '4tbzzP1Ztr3j4yyTNV9i', // ⚠️ สำคัญ: ต้องใส่รหัสผ่านของ DB ตัวใหม่นี้ (ไปดูใน Clever Cloud)
    database: 'boliw8r9sahjwiwa8lit', // ชื่อ Database ใหม่จากรูปของคุณ
    port: 3306,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL Database (Clever Cloud)');
        // ไม่ต้อง initDb() แล้วเพราะเราสร้างผ่าน phpMyAdmin แล้ว
        // แต่ถ้าจะสร้าง Auto ให้เปิด comment บรรทัดล่างได้
        // initDb(); 
    }
});

// --- Middleware ตรวจสอบ Token ---
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

// --- Helper: บันทึก Logs ---
const logAction = (entityId, action, actor, details) => {
    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details) VALUES (?, ?, ?, ?)';
    db.query(sql, [entityId, action, actor, details], (err) => {
        if (err) console.error("Log Error:", err);
    });
};

// ================= ROUTES =================

// 1. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: 'User not found' });

        const user = results[0];
        // เช็ค Password (แบบ Plain text ตามที่คุณใช้)
        if (password !== user.password) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, fullname: user.fullname, role: user.role }, 
            SECRET_KEY, 
            { expiresIn: '12h' }
        );
        res.json({ token, user });
    });
});

// 2. Register (สร้าง User ใหม่)
app.post('/api/register', (req, res) => {
    const { username, password, fullname, role } = req.body;
    // กำหนดค่า Default role เป็น user ถ้าไม่ได้ส่งมา
    const userRole = role || 'user'; 
    
    const sql = 'INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)';
    db.query(sql, [username, password, fullname, userRole], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'User registered successfully' });
    });
});

// --- Project Routes ---

// Get Projects (ดึงข้อมูลรวม updated_at)
app.get('/api/projects', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM projects ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Create Project
app.post('/api/projects', authenticateToken, (req, res) => {
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    
    // 🛠️ FIX: แปลงค่าว่าง "" ให้เป็น NULL เพื่อไม่ให้ Database Error
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = budget === "" ? 0 : budget;

    const sql = 'INSERT INTO projects (code, name, description, owner, budget, status, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate], (err, result) => {
        if (err) {
            console.error("Insert Error:", err); // ดู Error ใน Logs
            return res.status(500).json(err);
        }
        const newId = result.insertId;
        logAction(newId, 'CREATE', req.user.fullname, `สร้างโครงการ: ${name}`);
        res.json({ id: newId, ...req.body, updated_at: new Date() });
    });
});

// Update Project
app.put('/api/projects/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;

    // 🛠️ FIX: แปลงค่าว่าง "" ให้เป็น NULL
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = budget === "" ? 0 : budget;

    const sql = 'UPDATE projects SET code=?, name=?, description=?, owner=?, budget=?, status=?, startDate=?, endDate=? WHERE id=?';
    
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate, id], (err) => {
        if (err) return res.status(500).json(err);
        logAction(id, 'UPDATE', req.user.fullname, `แก้ไขโครงการ: ${name}`);
        res.json({ message: 'Updated successfully' });
    });
});

// Delete Project
app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const actor = req.user.fullname;
    
    // ดึงชื่อก่อนลบเพื่อเก็บ Log
    db.query('SELECT name FROM projects WHERE id = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({error: 'Not found'});
        const projName = results[0].name;

        db.query('DELETE FROM projects WHERE id = ?', [id], (delErr) => {
            if (delErr) return res.status(500).json(delErr);
            logAction(id, 'DELETE', actor, `ลบโครงการ: ${projName}`);
            res.json({ message: 'Deleted' });
        });
    });
});

// --- Audit Logs ---
app.get('/api/audit-logs', authenticateToken, (req, res) => {
    db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- Debug Route (เอาไว้ Reset DB ถ้าจำเป็น) ---
app.get('/api/debug/reset-db', (req, res) => {
    const dropTables = "DROP TABLE IF EXISTS audit_logs, projects, users";
    db.query(dropTables, (err) => {
        if (err) return res.status(500).send(err.message);
        // ตรงนี้คุณต้องมีฟังก์ชัน initDb ถ้าจะให้สร้างใหม่ Auto 
        // แต่แนะนำให้ใช้ phpMyAdmin SQL จะชัวร์กว่า
        res.send("Tables dropped. Please use phpMyAdmin to Import SQL.");
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
}); 