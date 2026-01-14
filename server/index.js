import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import 'dotenv/config'; // (Optional) เผื่อไว้ใช้ตอนรันในเครื่อง local

const app = express();

// ✅ แก้ไข 1: รับ Port จาก Render (ถ้าไม่มีให้ใช้ 3001)
const PORT = process.env.PORT || 3001; 

// ✅ แก้ไข 2: รับ Secret Key จาก Render (เพื่อความปลอดภัย)
const SECRET_KEY = process.env.SECRET_KEY || 'SecretKey_Ja_Dont_Tell_Anyone';

app.use(cors());
app.use(bodyParser.json());

// --- 1. เชื่อมต่อฐานข้อมูล (ปรับปรุงใหม่) ---
const db = mysql.createConnection({
    // ✅ ใช้ค่าจาก Environment Variables ที่เราไปตั้งใน Render
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saraban_track',
    port: process.env.DB_PORT || 3306,
    // ✅ เพิ่มส่วนนี้: ป้องกัน Database หลุดเมื่อไม่มีคนใช้นานๆ
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});
const initDb = () => {
    // 1. สร้างตาราง Users
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

    // 2. สร้างตาราง Projects
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

    // 3. สร้างตาราง Audit Logs
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

    // รันคำสั่งสร้างตาราง
    db.query(createUsersTable, (err) => {
        if (err) console.error("❌ Error creating users table:", err);
        else {
            console.log("✅ Users table ready");
            
            // --- เพิ่มส่วนนี้: สร้าง Admin อัตโนมัติ ---
            const checkAdmin = "SELECT * FROM users WHERE username = 'admin'";
            db.query(checkAdmin, (err, results) => {
                if (!err && results.length === 0) {
                    const insertAdmin = "INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)";
                    // สร้าง user: admin / password: 1234
                    db.query(insertAdmin, ['admin', '1234', 'System Admin', 'admin'], (err) => {
                        if (err) console.error("❌ Error creating admin:", err);
                        else console.log("✅ Default Admin created: admin / 1234");
                    });
                }
            });
            // ----------------------------------------
        }
    });

    db.query(createProjectsTable, (err) => {
        if (err) console.error("❌ Error creating projects table:", err);
        else console.log("✅ Projects table ready");
    });

    db.query(createAuditLogsTable, (err) => {
        if (err) console.error("❌ Error creating audit_logs table:", err);
        else console.log("✅ Audit Logs table ready");
    });
};
// เรียกใช้งานฟังก์ชันทันทีที่ Server เริ่มทำงาน
initDb();
db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        return;
    }
    console.log('✅ Connected to MySQL Database');
});

// --- 2. Middleware: ตรวจสอบ Token ---
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

// --- 3. ฟังก์ชันบันทึก Log (Audit Trail) ---
const logAction = (entityId, action, actor, details) => {
    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details) VALUES (?, ?, ?, ?)';
    db.query(sql, [entityId, action, actor, details], (err) => {
        if (err) console.error('Error logging action:', err);
    });
};

// ================= ROUTES =================

// 1. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(401).json({ message: 'User not found' });

        const user = results[0];
        if (password !== user.password) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, fullname: user.fullname }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ token, user: { id: user.id, username: user.username, fullname: user.fullname } });
    });
});

// 2. Register (สำหรับสร้าง Admin คนแรก)
app.post('/api/register', (req, res) => {
    const { username, password, fullname } = req.body;
    const sql = 'INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)';
    db.query(sql, [username, password, fullname], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'User registered successfully' });
    });
});

// --- PROJECT ROUTES ---

// Get All Projects
app.get('/api/projects', authenticateToken, (req, res) => {
    db.query('SELECT * FROM projects ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Create Project
app.post('/api/projects', authenticateToken, (req, res) => {
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    const sql = 'INSERT INTO projects (code, name, description, owner, budget, status, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    db.query(sql, [code, name, description, owner, budget, status, startDate, endDate], (err, result) => {
        if (err) return res.status(500).json(err);
        
        const newProjectId = result.insertId;
        logAction(newProjectId, 'CREATE', req.user.fullname, `สร้างโครงการใหม่: ${name} (${code})`);
        
        res.json({ id: newProjectId, ...req.body });
    });
});

// Update Project
app.put('/api/projects/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    
    // ดึงข้อมูลเก่าก่อนเพื่อเทียบความเปลี่ยนแปลง (Optional)
    db.query('SELECT * FROM projects WHERE id = ?', [id], (err, oldResults) => {
        if (err) return res.status(500).json(err);
        const oldProject = oldResults[0];

        const sql = 'UPDATE projects SET code=?, name=?, description=?, owner=?, budget=?, status=?, startDate=?, endDate=? WHERE id=?';
        db.query(sql, [code, name, description, owner, budget, status, startDate, endDate, id], (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);

            // Log การเปลี่ยนแปลงสถานะ
            if (oldProject && oldProject.status !== status) {
                logAction(id, 'UPDATE', req.user.fullname, `เปลี่ยนสถานะโครงการ ${code} จาก ${oldProject.status} เป็น ${status}`);
            } else {
                logAction(id, 'UPDATE', req.user.fullname, `แก้ไขข้อมูลโครงการ: ${name} (${code})`);
            }

            res.json({ message: 'Project updated successfully' });
        });
    });
});

// Delete Project
app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const actor = req.user.fullname;

    // 1. ดึงชื่อโครงการมาก่อนเพื่อบันทึก Log
    db.query('SELECT * FROM projects WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: 'Project not found' });

        const project = results[0];
        const logDetail = `ลบโครงการ: ${project.name} (${project.code})`;
        
        // 2. บันทึก Log ก่อนลบ (เพื่อให้มีประวัติว่าใครลบอะไรไป)
        logAction(id, 'DELETE', actor, logDetail);

        // 3. ลบจริง
        db.query('DELETE FROM projects WHERE id = ?', [id], (deleteErr) => {
            if (deleteErr) return res.status(500).json(deleteErr);
            res.json({ message: 'Project deleted successfully' });
        });
    });
});

// --- LOG ROUTES ---

// Get Logs of a Project
app.get('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC', [id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Delete Log (Timeline Item)
app.delete('/api/logs/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM audit_logs WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Log deleted successfully' });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});