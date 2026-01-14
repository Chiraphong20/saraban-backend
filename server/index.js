import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ ใช้ Secret Key จากรูปภาพของคุณ
const SECRET_KEY = 'MySuperSecretKey2024'; 

app.use(cors());
app.use(bodyParser.json());

// --- 1. เชื่อมต่อฐานข้อมูล (ใส่ค่าจากรูปภาพของคุณให้แล้ว) ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'bmmzvfeadsvi7aqynhto-mysql.services.clever-cloud.com',
    user: process.env.DB_USER || 'uegstlfsoy1kxqhn',
    password: process.env.DB_PASSWORD || 'vj3TqbY1gk2Q1XrRCMjd',
    database: process.env.DB_NAME || 'bmmzvfeadsvi7aqynhto',
    port: process.env.DB_PORT || 3306,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// ตรวจสอบการเชื่อมต่อ
db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL Database (Clever Cloud)');
        initDb(); // เรียกสร้างตารางเมื่อต่อติด
    }
});

// --- ฟังก์ชันสร้างตารางและ Admin ---
const initDb = () => {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            fullname VARCHAR(255) NOT NULL,
            role ENUM('admin', 'user') DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createProjectsTable = `
        CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            owner VARCHAR(255),
            budget DECIMAL(15, 2),
            status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
            startDate DATE,
            endDate DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createAuditLogsTable = `
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            entity_id INT NOT NULL,
            action VARCHAR(50) NOT NULL,
            actor VARCHAR(255) NOT NULL,
            details TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // สร้างตาราง
    db.query(createUsersTable, (err) => { if (err) console.error("Error users:", err); });
    db.query(createProjectsTable, (err) => { if (err) console.error("Error projects:", err); });
    db.query(createAuditLogsTable, (err) => { if (err) console.error("Error audit_logs:", err); });

    // สร้าง Admin อัตโนมัติถ้ายังไม่มี
    const checkAdmin = "SELECT * FROM users WHERE username = 'admin'";
    db.query(checkAdmin, (err, results) => {
        if (!err && results.length === 0) {
            const insertAdmin = "INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)";
            db.query(insertAdmin, ['admin', '1234', 'System Admin', 'admin'], (err) => {
                if (!err) console.log("✅ Default Admin created: admin / 1234");
            });
        }
    });
};

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

const logAction = (entityId, action, actor, details) => {
    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details) VALUES (?, ?, ?, ?)';
    db.query(sql, [entityId, action, actor, details], (err) => console.error(err));
};

// ================= ROUTES =================

// 1. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // ใช้ ? เพื่อป้องกัน SQL Injection
    const sql = 'SELECT * FROM users WHERE username = ?';
    
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error("Login Error:", err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) return res.status(401).json({ message: 'User not found' });

        const user = results[0];
        // เปรียบเทียบรหัสผ่าน (ในที่นี้เป็น Plain text ตามที่คุณใช้ 1234)
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

// 2. Register
app.post('/api/register', (req, res) => {
    const { username, password, fullname } = req.body;
    const sql = 'INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)';
    db.query(sql, [username, password, fullname], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'User registered successfully' });
    });
});

// --- Project Routes ---
app.get('/api/projects', authenticateToken, (req, res) => {
    db.query('SELECT * FROM projects ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/projects', authenticateToken, (req, res) => {
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    const sql = 'INSERT INTO projects (code, name, description, owner, budget, status, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [code, name, description, owner, budget, status, startDate, endDate], (err, result) => {
        if (err) return res.status(500).json(err);
        const newId = result.insertId;
        logAction(newId, 'CREATE', req.user.fullname, `สร้างโครงการ: ${name}`);
        res.json({ id: newId, ...req.body });
    });
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    const sql = 'UPDATE projects SET code=?, name=?, description=?, owner=?, budget=?, status=?, startDate=?, endDate=? WHERE id=?';
    db.query(sql, [code, name, description, owner, budget, status, startDate, endDate, id], (err) => {
        if (err) return res.status(500).json(err);
        logAction(id, 'UPDATE', req.user.fullname, `แก้ไขโครงการ: ${name}`);
        res.json({ message: 'Updated' });
    });
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const actor = req.user.fullname;
    
    // ดึงชื่อก่อนลบเพื่อทำ Log
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

// --- Logs ---
app.get('/api/audit-logs', authenticateToken, (req, res) => {
    db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- 🛠️ DEBUG ROUTE: ล้างฐานข้อมูล (ใช้เมื่อเกิด Error 500 ค้าง) ---
app.get('/api/debug/reset-db', (req, res) => {
    const dropTables = "DROP TABLE IF EXISTS audit_logs, projects, users";
    db.query(dropTables, (err) => {
        if (err) return res.status(500).send(err.message);
        initDb();
        res.send("✅ Database Reset Successful! Admin: admin/1234");
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});