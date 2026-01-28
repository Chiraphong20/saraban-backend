import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import multer from 'multer'; // ✅ เพิ่ม multer
import path from 'path';     // ✅ เพิ่ม path
import fs from 'fs';         // ✅ เพิ่ม fs
import { fileURLToPath } from 'url'; // ✅ แก้ปัญหา path ใน ES Module
import 'dotenv/config';

// ตั้งค่า __dirname ให้ใช้ได้ใน ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'MySuperSecretKey2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ แก้ปัญหา CORS รูปภาพ: อนุญาตให้เว็บอื่นดึงรูปไปแสดงได้ (แก้ปัญหา PDF ขาว)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: function (res, path, stat) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// --- 1. การเชื่อมต่อฐานข้อมูล ---
const db = mysql.createConnection({
    host: 'bcxqbc79bllal1dqsids-mysql.services.clever-cloud.com',
    user: 'ugkck79inxfxkjrf',     
    password: 'ckEDWQRFzCx1tCLmv9Gn', 
    database: 'bcxqbc79bllal1dqsids', 
    port: 3306,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: true // ✅ เปิดให้รันคำสั่ง SQL ซ้อนกันได้
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL Database (Clever Cloud)');
        // 🔥 สร้างตารางอัตโนมัติเมื่อต่อติด (แก้ปัญหา 500 หาตารางไม่เจอ)
        initDatabase();
    }
});

// --- ฟังก์ชันสร้างตารางอัตโนมัติ (Auto Migration) ---
const initDatabase = () => {
    // 
    const sql = `
        CREATE TABLE IF NOT EXISTS project_features (
            id int NOT NULL AUTO_INCREMENT,
            project_id int NOT NULL,
            title varchar(255) NOT NULL,
            detail text,
            next_list text,
            status varchar(50) DEFAULT 'PENDING',
            start_date date DEFAULT NULL,
            due_date date DEFAULT NULL,
            remark text,
            note_by varchar(255),
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

        -- ✅ 3. เพิ่มตาราง Notifications (แจ้งเตือน) อัตโนมัติ
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            triggered_by VARCHAR(255),
            message TEXT,
            link_url VARCHAR(255),
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    db.query(sql, (err) => {
        if (err) console.error("❌ Init DB Error:", err);
        else console.log("✅ Tables (Features, Notes, Notifications) checked/created successfully!");
    });
};

// --- ตั้งค่า Multer (Upload File) ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์: file-เวลา-ตัวเลขสุ่ม.นามสกุล
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

// --- Middleware: Auth ---
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

// Helper: Log Action
const logAction = (entityId, action, actor, details) => {
    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, NOW())';
    db.query(sql, [entityId, action, actor, details], (err) => {
        if (err) console.error("Log Error:", err);
    });
};

// ================= ROUTES =================

// 1. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: 'User not found' });
        const user = results[0];
        if (password !== user.password) return res.status(401).json({ message: 'Invalid password' });
        const token = jwt.sign({ id: user.id, username: user.username, fullname: user.fullname, role: user.role }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ token, user });
    });
});

// 2. Register
app.post('/api/register', (req, res) => {
    const { username, password, fullname, role } = req.body;
    const userRole = role || 'user'; 
    db.query('INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)', [username, password, fullname, userRole], (err, result) => {
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
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = (budget === "" || budget === null) ? 0 : budget;
    const sql = 'UPDATE projects SET code=?, name=?, description=?, owner=?, budget=?, status=?, startDate=?, endDate=? WHERE id=?';
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        logAction(req.params.id, 'UPDATE', req.user.fullname, `แก้ไขข้อมูลโครงการ: ${name} (สถานะ: ${status})`);
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
        
        db.query('INSERT INTO audit_logs (entity_id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, NOW())', [projectId, 'DELETE', actor, logDetail], (logErr) => {
            db.query('DELETE FROM projects WHERE id = ?', [projectId], (delErr) => {
                if (delErr) return res.status(500).json(delErr);
                res.json({ message: 'Deleted and logged successfully' });
            });
        });
    });
});

// --- Timeline & Logs Routes ---
app.get('/api/projects/:id/logs', authenticateToken, (req, res) => {
    db.query('SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC', [req.params.id], (err, results) => {
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
    db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ✅ 4. อัปเดตการดึง Notification จากตารางจริง (แทน audit_logs)
app.get('/api/notifications', authenticateToken, (req, res) => {
    const sql = `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- User Profile Routes ---
app.put('/api/profile', authenticateToken, (req, res) => {
    const { fullname } = req.body;
    db.query('UPDATE users SET fullname = ? WHERE id = ?', [fullname, req.user.id], (err, result) => {
        if (err) return res.status(500).json(err);
        logAction(req.user.id, 'UPDATE', req.user.username, 'แก้ไขข้อมูลส่วนตัว');
        res.json({ message: 'Profile updated successfully', user: { ...req.user, fullname } });
    });
});

app.put('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    db.query('SELECT password FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0 || results[0].password !== currentPassword) return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, req.user.id], (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);
            logAction(req.user.id, 'UPDATE', req.user.username, 'ทำการเปลี่ยนรหัสผ่าน');
            res.json({ message: 'Password changed successfully' });
        });
    });
});

// --- Project Features Routes ---
app.get('/api/projects/:id/features', authenticateToken, (req, res) => {
    db.query('SELECT * FROM project_features WHERE project_id = ? ORDER BY start_date ASC', [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/projects/:id/features', authenticateToken, (req, res) => {
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;
    const sql = `INSERT INTO project_features (project_id, title, detail, next_list, status, start_date, due_date, remark, note_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [req.params.id, title, detail, next_list, status, start_date, due_date, remark, req.user.username], (err, result) => {
        if (err) return res.status(500).json(err);
        logAction(req.params.id, 'PLAN', req.user.username, `เพิ่มแผนงาน: ${title}`);
        res.json({ message: 'Feature added successfully', id: result.insertId });
    });
});

app.put('/api/features/:id', authenticateToken, (req, res) => {
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;
    const sql = `UPDATE project_features SET title=?, detail=?, next_list=?, status=?, start_date=?, due_date=?, remark=?, note_by=? WHERE id=?`;
    db.query(sql, [title, detail, next_list, status, start_date, due_date, remark, req.user.username, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Feature updated successfully' });
    });
});

app.delete('/api/features/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM project_features WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Feature deleted successfully' });
    });
});

// --- Feature Notes Routes (With Upload Support) ---
app.get('/api/features/:id/notes', authenticateToken, (req, res) => {
    // ✅ เลือกจากตารางใหม่ project_feature_notes
    db.query('SELECT * FROM project_feature_notes WHERE feature_id = ? ORDER BY created_at DESC', [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 
// ✅ 5. แก้ไข API POST Note ให้สร้าง Notification ด้วย
app.post('/api/features/:id/notes', authenticateToken, upload.single('file'), (req, res) => {
    const { content } = req.body;
    const featureId = req.params.id;
    const file = req.file;
    const user = req.user.fullname || req.user.username;

    let attachment = null;
    let attachmentType = null;

    if (file) {
        // สร้าง URL แบบ HTTPS (แก้ CORS)
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        attachment = `${protocol}://${host}/uploads/${file.filename}`;
        attachmentType = file.mimetype;
    }

    // 5.1 บันทึก Note ลงฐานข้อมูล
    const sql = `INSERT INTO project_feature_notes (feature_id, content, created_by, attachment, attachment_type) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [featureId, content, user, attachment, attachmentType], (err, result) => {
        if (err) { console.error(err); return res.status(500).json(err); }
        
        const newNoteId = result.insertId;

        // 5.2 🔥 สร้าง Notification ทันทีหลังจาก Note เสร็จ
        const notifMessage = `คุณ ${user} เพิ่มบันทึกในงาน #${featureId}`;
        const linkUrl = `/project/timeline/${featureId}`; // ลิงก์ไว้กดกลับมาดู
        const sqlNotif = `INSERT INTO notifications (triggered_by, message, link_url, created_at) VALUES (?, ?, ?, NOW())`;

        db.query(sqlNotif, [user, notifMessage, linkUrl], (errNotif) => {
            if (errNotif) console.error("Notification Error:", errNotif); // Log error แต่ไม่หยุดการทำงาน
            
            // ส่ง Response กลับไปที่ Frontend
            res.json({
                id: newNoteId, 
                content, 
                created_by: user,
                attachment, 
                attachment_type: attachmentType, 
                created_at: new Date()
            });
        });
    });
});

// --- Quick Notes Routes ---
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