import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import multer from 'multer'; // ✅ เพิ่ม multer สำหรับอัปโหลดไฟล์
import path from 'path';     // ✅ เพิ่ม path จัดการพาทไฟล์
import fs from 'fs';         // ✅ เพิ่ม fs จัดการไฟล์ระบบ
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'MySuperSecretKey2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ เปิดให้เข้าถึงไฟล์ในโฟลเดอร์ uploads ได้แบบสาธารณะ (Static Files)
app.use('/uploads', express.static('uploads'));

// --- 1. การเชื่อมต่อฐานข้อมูล (Database Connection) ---
const db = mysql.createConnection({
    host: 'bcxqbc79bllal1dqsids-mysql.services.clever-cloud.com',
    user: 'ugkck79inxfxkjrf',     
    password: 'ckEDWQRFzCx1tCLmv9Gn', 
    database: 'bcxqbc79bllal1dqsids', 
    port: 3306,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL Database (Clever Cloud)');
    }
});

// --- ✅ ตั้งค่า Multer สำหรับอัปโหลดไฟล์ ---
// ตรวจสอบว่ามีโฟลเดอร์ uploads หรือไม่ ถ้าไม่มีให้สร้างใหม่
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // เก็บไฟล์ในโฟลเดอร์ uploads
    },
    filename: function (req, file, cb) {
        // ตั้งชื่อไฟล์ใหม่กันซ้ำ: file-เวลา-ตัวเลขสุ่ม.นามสกุลเดิม
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'file-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // จำกัดขนาดไฟล์ไม่เกิน 10MB
});

// --- Middleware: ตรวจสอบ Token และดึงข้อมูล User ---
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

// --- Helper: ฟังก์ชันบันทึก Log ---
const logAction = (entityId, action, actor, details) => {
    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, NOW())';
    db.query(sql, [entityId, action, actor, details], (err) => {
        if (err) console.error("Log Error:", err);
    });
};

// ================= ROUTES =================

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: 'User not found' });

        const user = results[0];
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

// Get All Projects
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
    
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = (budget === "" || budget === null) ? 0 : budget;

    const sql = 'INSERT INTO projects (code, name, description, owner, budget, status, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate], (err, result) => {
        if (err) return res.status(500).json(err);
        const newId = result.insertId;
        logAction(newId, 'CREATE', req.user.fullname, `สร้างโครงการ: ${name} (${code})`);
        res.json({ id: newId, ...req.body, updated_at: new Date() });
    });
});

// Update Project
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

// Delete Project
app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const actor = req.user.fullname || req.user.username || 'Unknown';

    const getProjectSql = 'SELECT code, name FROM projects WHERE id = ?';
    db.query(getProjectSql, [projectId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Project not found' });

        const project = results[0];
        const logDetail = `ลบโครงการ: ${project.code} - ${project.name}`;

        const logSql = 'INSERT INTO audit_logs (entity_id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, NOW())';
        db.query(logSql, [projectId, 'DELETE', actor, logDetail], (logErr) => {
            if (logErr) console.error('Failed to log deletion:', logErr);

            const deleteSql = 'DELETE FROM projects WHERE id = ?';
            db.query(deleteSql, [projectId], (delErr) => {
                if (delErr) return res.status(500).json(delErr);
                res.json({ message: 'Deleted and logged successfully' });
            });
        });
    });
});

// --- Timeline & Logs Routes ---

// Get Logs for specific project
app.get('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC';
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Add Log manually
app.post('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { note, action } = req.body; 
    const actor = req.user.fullname;
    const actionType = action || 'NOTE'; 

    logAction(id, actionType, actor, note);
    res.json({ message: 'Log added successfully' });
});

// Get All Logs (Global)
app.get('/api/audit-logs', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000'; 
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- Notification Route ---
app.get('/api/notifications', authenticateToken, (req, res) => {
    // ใช้วิธีดึงจาก audit_logs ล่าสุดแทนตาราง notifications เพื่อเลี่ยง Error ตารางไม่ครบ
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

// --- User Profile Routes ---
app.put('/api/profile', authenticateToken, (req, res) => {
    const { fullname } = req.body;
    const userId = req.user.id;
    const sql = 'UPDATE users SET fullname = ? WHERE id = ?';
    db.query(sql, [fullname, userId], (err, result) => {
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

// ==========================================
// --- PROJECT FEATURES (TIMELINE) ROUTES ---
// ==========================================

// 1. ดึง Features ของโปรเจกต์
app.get('/api/projects/:id/features', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    // ใช้ชื่อตาราง project_features ให้ตรงกับ SQL ที่แก้
    const sql = 'SELECT * FROM project_features WHERE project_id = ? ORDER BY start_date ASC';
    db.query(sql, [projectId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. เพิ่ม Feature ใหม่
app.post('/api/projects/:id/features', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;
    const note_by = req.user.username;

    const sql = `
        INSERT INTO project_features 
        (project_id, title, detail, next_list, status, start_date, due_date, remark, note_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [projectId, title, detail, next_list, status, start_date, due_date, remark, note_by], (err, result) => {
        if (err) return res.status(500).json(err);
        logAction(projectId, 'PLAN', req.user.username, `เพิ่มแผนงาน: ${title}`);
        res.json({ message: 'Feature added successfully', id: result.insertId });
    });
});

// 3. แก้ไข Feature
app.put('/api/features/:id', authenticateToken, (req, res) => {
    const featureId = req.params.id;
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;
    const note_by = req.user.username;

    const sql = `
        UPDATE project_features 
        SET title=?, detail=?, next_list=?, status=?, start_date=?, due_date=?, remark=?, note_by=?
        WHERE id=?
    `;
    
    db.query(sql, [title, detail, next_list, status, start_date, due_date, remark, note_by, featureId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Feature updated successfully' });
    });
});

// 4. ลบ Feature
app.delete('/api/features/:id', authenticateToken, (req, res) => {
    const featureId = req.params.id;
    const sql = 'DELETE FROM project_features WHERE id=?';
    db.query(sql, [featureId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Feature deleted successfully' });
    });
});

// ==========================================
// --- FEATURE NOTES ROUTES (WITH UPLOAD) ---
// ==========================================

// 1. ดึง Notes ทั้งหมดของ Feature หนึ่งๆ
app.get('/api/features/:id/notes', authenticateToken, (req, res) => {
    // ✅ ใช้ชื่อตาราง project_feature_notes
    const sql = 'SELECT * FROM project_feature_notes WHERE feature_id = ? ORDER BY created_at DESC';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. ✅ เพิ่ม Note ให้ Feature (รองรับการแนบไฟล์ผ่าน Multer)
app.post('/api/features/:id/notes', authenticateToken, upload.single('file'), (req, res) => {
    const featureId = req.params.id;
    const { content } = req.body;
    const user = req.user.username || req.user.fullname; 
    const file = req.file;

    // เตรียม URL ไฟล์ถ้ามีการอัปโหลด
    let attachment = null;
    let attachmentType = null;

    if (file) {
        // สร้าง Full URL: https://your-server.com/uploads/filename
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
            console.error("Insert Note Error:", err);
            return res.status(500).json(err);
        }
        
        // ส่งข้อมูลกลับไปให้ Frontend แสดงผลทันที
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

// --- Quick Notes Routes (Dashboard) ---

app.get('/api/notes', authenticateToken, (req, res) => {
    const username = req.user.username;
    db.query('SELECT * FROM quick_notes WHERE created_by = ? ORDER BY created_at DESC', [username], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/notes', authenticateToken, (req, res) => {
    const { content } = req.body;
    const username = req.user.username;
    db.query('INSERT INTO quick_notes (content, created_by) VALUES (?, ?)', [content, username], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ id: result.insertId, content, created_by: username });
    });
});

app.delete('/api/notes/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM quick_notes WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Deleted' });
    });
});

app.put('/api/notes/:id', authenticateToken, (req, res) => {
    const { content } = req.body;
    const noteId = req.params.id;
    const username = req.user.username;

    const sql = 'UPDATE quick_notes SET content = ? WHERE id = ? AND created_by = ?';
    db.query(sql, [content, noteId, username], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Note updated successfully', content });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});