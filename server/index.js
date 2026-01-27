import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import multer from 'multer'; // ✅ เพิ่ม multer
import path from 'path';     // ✅ เพิ่ม path
import fs from 'fs';         // ✅ เพิ่ม fs
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'MySuperSecretKey2024';

app.use(cors());
app.use(bodyParser.json());

// ✅ 1. เปิดให้เข้าถึงไฟล์ในโฟลเดอร์ uploads ได้
app.use('/uploads', express.static('uploads'));

// --- การเชื่อมต่อฐานข้อมูล (Database Connection) ---
const db = mysql.createConnection({
    host: 'bcxqbc79bllal1dqsids-mysql.services.clever-cloud.com',
    user: 'ugkck79inxfxkjrf',     
    password: 'ckEDWQRFzCx1tCLmv9Gn', 
    database: 'bcxqbc79bllal1dqsids', 
    port: 3306,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: true // ✅ สำคัญ: เปิดให้รันคำสั่ง SQL ซ้อนกันได้
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL Database (Clever Cloud)');
        // 🔥 สั่งให้สร้างตารางทันทีเมื่อต่อติด
        initDatabase();
    }
});

// --- 🔥 ฟังก์ชันสร้างตารางอัตโนมัติ (Auto Migration) ---
// ส่วนนี้จะช่วยแก้ปัญหาที่คุณเข้า phpMyAdmin ไม่ได้
const initDatabase = () => {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS project_feature_notes (
            id int NOT NULL AUTO_INCREMENT,
            feature_id int NOT NULL,
            content text NOT NULL,
            created_by varchar(255) NOT NULL,
            attachment text DEFAULT NULL,
            attachment_type varchar(100) DEFAULT NULL,
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    db.query(createTableSQL, (err) => {
        if (err) {
            console.error("❌ Error creating table:", err);
        } else {
            console.log("✅ Table 'project_feature_notes' checked/created successfully!");
        }
    });
};

// --- ✅ 2. ตั้งค่า Multer สำหรับอัปโหลดไฟล์ ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'file-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // จำกัด 10MB
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

// Helper: Log
const logAction = (entityId, action, actor, details) => {
    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, NOW())';
    db.query(sql, [entityId, action, actor, details], (err) => {
        if (err) console.error("Log Error:", err);
    });
};

// ================= ROUTES =================

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: 'User not found' });

        const user = results[0];
        if (password !== user.password) return res.status(401).json({ message: 'Invalid password' });

        const token = jwt.sign(
            { id: user.id, username: user.username, fullname: user.fullname, role: user.role }, 
            SECRET_KEY, 
            { expiresIn: '12h' }
        );
        res.json({ token, user });
    });
});

// Register
app.post('/api/register', (req, res) => {
    const { username, password, fullname, role } = req.body;
    const userRole = role || 'user'; 
    const sql = 'INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)';
    db.query(sql, [username, password, fullname, userRole], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'User registered successfully' });
    });
});

// --- Project Routes ---
app.get('/api/projects', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM projects ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/projects', authenticateToken, (req, res) => {
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = (budget === "" || budget === null) ? 0 : budget;

    const sql = 'INSERT INTO projects (code, name, description, owner, budget, status, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate], (err, result) => {
        if (err) return res.status(500).json(err);
        logAction(result.insertId, 'CREATE', req.user.fullname, `สร้างโครงการ: ${name} (${code})`);
        res.json({ id: result.insertId, ...req.body, updated_at: new Date() });
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
        logAction(id, 'UPDATE', req.user.fullname, `แก้ไขข้อมูลโครงการ: ${name} (สถานะ: ${status})`);
        res.json({ message: 'Updated successfully' });
    });
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const actor = req.user.fullname || req.user.username || 'Unknown';
    db.query('SELECT code, name FROM projects WHERE id = ?', [projectId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Project not found' });

        const project = results[0];
        const logDetail = `ลบโครงการ: ${project.code} - ${project.name}`;
        
        // Log then Delete
        db.query('INSERT INTO audit_logs (entity_id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, NOW())', [projectId, 'DELETE', actor, logDetail], (logErr) => {
            db.query('DELETE FROM projects WHERE id = ?', [projectId], (delErr) => {
                if (delErr) return res.status(500).json(delErr);
                res.json({ message: 'Deleted and logged successfully' });
            });
        });
    });
});

// --- Timeline & Logs ---
app.get('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { note, action } = req.body; 
    logAction(id, action || 'NOTE', req.user.fullname, note);
    res.json({ message: 'Log added successfully' });
});

app.get('/api/audit-logs', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000'; 
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/notifications', authenticateToken, (req, res) => {
    const sql = `
        SELECT audit_logs.*, projects.code as project_code 
        FROM audit_logs 
        LEFT JOIN projects ON audit_logs.entity_id = projects.id 
        ORDER BY audit_logs.timestamp DESC 
        LIMIT 20
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- User Profile ---
app.put('/api/profile', authenticateToken, (req, res) => {
    const { fullname } = req.body;
    const userId = req.user.id;
    db.query('UPDATE users SET fullname = ? WHERE id = ?', [fullname, userId], (err, result) => {
        if (err) return res.status(500).json(err);
        logAction(userId, 'UPDATE', req.user.username, 'แก้ไขข้อมูลส่วนตัว');
        res.json({ message: 'Profile updated successfully', user: { ...req.user, fullname } });
    });
});

app.put('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    db.query('SELECT password FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0 || results[0].password !== currentPassword) {
            return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }
        db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId], (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);
            logAction(userId, 'UPDATE', req.user.username, 'ทำการเปลี่ยนรหัสผ่าน');
            res.json({ message: 'Password changed successfully' });
        });
    });
});

// --- Project Features ---
app.get('/api/projects/:id/features', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM project_features WHERE project_id = ? ORDER BY start_date ASC';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/projects/:id/features', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;
    
    const sql = `
        INSERT INTO project_features 
        (project_id, title, detail, next_list, status, start_date, due_date, remark, note_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [projectId, title, detail, next_list, status, start_date, due_date, remark, req.user.username], (err, result) => {
        if (err) return res.status(500).json(err);
        logAction(projectId, 'PLAN', req.user.username, `เพิ่มแผนงาน: ${title}`);
        res.json({ message: 'Feature added successfully', id: result.insertId });
    });
});

app.put('/api/features/:id', authenticateToken, (req, res) => {
    const featureId = req.params.id;
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;

    const sql = `
        UPDATE project_features 
        SET title=?, detail=?, next_list=?, status=?, start_date=?, due_date=?, remark=?, note_by=?
        WHERE id=?
    `;
    
    db.query(sql, [title, detail, next_list, status, start_date, due_date, remark, req.user.username, featureId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Feature updated successfully' });
    });
});

app.delete('/api/features/:id', authenticateToken, (req, res) => {
    const sql = 'DELETE FROM project_features WHERE id=?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Feature deleted successfully' });
    });
});

// --- ✅ Feature Notes (พร้อม Upload) ---
app.get('/api/features/:id/notes', authenticateToken, (req, res) => {
    // ใช้ตารางที่สร้างใหม่โดยอัตโนมัติ
    const sql = 'SELECT * FROM project_feature_notes WHERE feature_id = ? ORDER BY created_at DESC';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/features/:id/notes', authenticateToken, upload.single('file'), (req, res) => {
    const featureId = req.params.id;
    const { content } = req.body;
    const user = req.user.username || req.user.fullname; 
    const file = req.file;

    let attachment = null;
    let attachmentType = null;

    if (file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        attachment = `${baseUrl}/uploads/${file.filename}`;
        attachmentType = file.mimetype;
    }

    const sql = `
        INSERT INTO project_feature_notes 
        (feature_id, content, created_by, attachment, attachment_type) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [featureId, content, user, attachment, attachmentType], (err, result) => {
        if (err) {
            console.error("Insert Error:", err);
            return res.status(500).json(err);
        }
        
        res.json({
            id: result.insertId,
            content,
            created_by: user,
            attachment,
            attachment_type: attachmentType,
            created_at: new Date()
        });
    });
});

// --- Quick Notes ---
app.get('/api/notes', authenticateToken, (req, res) => {
    db.query('SELECT * FROM quick_notes WHERE created_by = ? ORDER BY created_at DESC', [req.user.username], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/notes', authenticateToken, (req, res) => {
    db.query('INSERT INTO quick_notes (content, created_by) VALUES (?, ?)', [req.body.content, req.user.username], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ id: result.insertId, content: req.body.content, created_by: req.user.username });
    });
});

app.delete('/api/notes/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM quick_notes WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Deleted' });
    });
});

app.put('/api/notes/:id', authenticateToken, (req, res) => {
    const sql = 'UPDATE quick_notes SET content = ? WHERE id = ? AND created_by = ?';
    db.query(sql, [req.body.content, req.params.id, req.user.username], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Note updated successfully', content: req.body.content });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});