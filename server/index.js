import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// ตั้งค่า Path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'MySuperSecretKey2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Config รูปภาพ
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: function (res, path, stat) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// --- Database Connection ---
const db = mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    user: '2oAkcq9JFY1KMQW.root',     
    password: 'sDjOs5ELKfuZYqo3', 
    database: 'test', 
    port: 4000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: true,
    ssl: {rejectUnauthorized: false}
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        return;
    }
    console.log('✅ Connected to TiDB Cloud successfully!');
});

// --- Init Database ---
const initDatabase = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            entity_id INT,
            action VARCHAR(50),
            actor VARCHAR(255),
            details TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255), password VARCHAR(255), fullname VARCHAR(255), role VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        CREATE TABLE IF NOT EXISTS projects (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50), name VARCHAR(255), description TEXT, owner VARCHAR(255), budget DECIMAL(15,2), status VARCHAR(50), startDate DATE, endDate DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        CREATE TABLE IF NOT EXISTS project_features (id int NOT NULL AUTO_INCREMENT, project_id int NOT NULL, title varchar(255) NOT NULL, detail text, next_list text, status varchar(50) DEFAULT 'PENDING', start_date date DEFAULT NULL, due_date date DEFAULT NULL, remark text, note_by varchar(255), created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        CREATE TABLE IF NOT EXISTS project_feature_notes (id int NOT NULL AUTO_INCREMENT, feature_id int NOT NULL, content text NOT NULL, created_by varchar(255) NOT NULL, attachment text DEFAULT NULL, attachment_type varchar(100) DEFAULT NULL, created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        CREATE TABLE IF NOT EXISTS quick_notes (id INT AUTO_INCREMENT PRIMARY KEY, content TEXT NOT NULL, created_by VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    db.query(sql, (err) => {
        if (err) console.error("Init DB Error:", err);
    });
};

// --- Config Multer ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// --- Middleware: Auth ---
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 🔥 Helper: Log Action (✅ แก้กลับมาใช้ NOW() แล้ว)
const logAction = (entityId, action, actor, details) => {
    // ใช้ NOW() เพราะ Server เป็นเวลาไทยอยู่แล้ว
    const sql = 'INSERT INTO audit_logs (entity_id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, NOW())';
    db.query(sql, [entityId, action, actor, details], (err) => {
        if (err) console.error("Log Error:", err);
        else console.log(`✅ Logged: ${action} - ${details}`);
    });
};

// ================= ROUTES =================

// Auth
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0 || results[0].password !== password) return res.status(401).json({ message: 'Invalid credentials' });
        const user = results[0];
        const token = jwt.sign({ id: user.id, username: user.username, fullname: user.fullname, role: user.role }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ token, user });
    });
});
app.post('/api/register', (req, res) => {
    const { username, password, fullname, role } = req.body;
    db.query('INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)', [username, password, fullname, role || 'user'], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Registered' });
    });
});

// --- Projects (Logic ครบ: จัดการ NULL ป้องกัน Error 500) ---
app.get('/api/projects', authenticateToken, (req, res) => {
    db.query('SELECT * FROM projects ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/projects', authenticateToken, (req, res) => {
    const { code, name, description, owner, budget, status, startDate, endDate } = req.body;
    
    // จัดการค่าว่าง
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = (budget === "" || budget === null) ? 0 : budget;

    const sql = 'INSERT INTO projects (code, name, description, owner, budget, status, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate], (err, result) => {
        if (err) return res.status(500).json(err);
        logAction(result.insertId, 'CREATE', req.user.fullname, `สร้างโครงการใหม่: ${name} (${code})`);
        res.json({ id: result.insertId, ...req.body });
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
        logAction(req.params.id, 'UPDATE', req.user.fullname, `อัปเดตโครงการ: ${name}`);
        res.json({ message: 'Updated' });
    });
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    db.query('SELECT name FROM projects WHERE id=?', [req.params.id], (err, results) => {
        const projectName = results[0] ? results[0].name : 'Unknown Project';
        db.query('DELETE FROM projects WHERE id = ?', [req.params.id], (delErr) => {
            if (delErr) return res.status(500).json(delErr);
            logAction(req.params.id, 'DELETE', req.user.fullname, `ลบโครงการ: ${projectName}`);
            res.json({ message: 'Deleted' });
        });
    });
});
app.get('/api/notifications', authenticateToken, (req, res) => {
    const sql = `SELECT id, entity_id, actor, details, action, timestamp, 'System' AS project_code FROM audit_logs ORDER BY timestamp DESC LIMIT 50`;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});
app.get('/api/audit-logs', authenticateToken, (req, res) => {
    db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- Features (Timeline) ---
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
        logAction(req.params.id, 'CREATE', req.user.fullname, `เพิ่มแผนงาน: ${title}`);
        res.json({ message: 'Added', id: result.insertId });
    });
});

app.put('/api/features/:id', authenticateToken, (req, res) => {
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;
    const sql = `UPDATE project_features SET title=?, detail=?, next_list=?, status=?, start_date=?, due_date=?, remark=?, note_by=? WHERE id=?`;
    const params = [title, detail, next_list, status, start_date, due_date, remark, req.user.username, req.params.id];
    db.query(sql, params, (err) => {
        if (err) return res.status(500).json(err);
        logAction(req.params.id, 'UPDATE', req.user.fullname, `แก้ไขแผนงาน: ${title}`);
        res.json({ message: 'Updated' });
    });
});

app.delete('/api/features/:id', authenticateToken, (req, res) => {
    db.query('SELECT title FROM project_features WHERE id=?', [req.params.id], (err, results) => {
        const featureTitle = results[0] ? results[0].title : 'Unknown Feature';
        db.query('DELETE FROM project_features WHERE id=?', [req.params.id], (delErr) => {
            if (delErr) return res.status(500).json(delErr);
            logAction(req.params.id, 'DELETE', req.user.fullname, `ลบแผนงาน: ${featureTitle}`);
            res.json({ message: 'Deleted' });
        });
    });
});

// --- Notes (Timeline Notes) ---
app.get('/api/features/:id/notes', authenticateToken, (req, res) => {
    db.query('SELECT * FROM project_feature_notes WHERE feature_id = ? ORDER BY created_at DESC', [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/features/:id/notes', authenticateToken, upload.single('file'), (req, res) => {
    const { content } = req.body;
    const featureId = req.params.id;
    const file = req.file;
    const user = req.user.fullname || req.user.username;
    
    let attachment = null;
    let attachmentType = null;

    if (file) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        attachment = `${protocol}://${host}/uploads/${file.filename}`;
        attachmentType = file.mimetype;
    }

    // ✅ ใช้ NOW() เวลาปกติ (เพราะ Server เป็นเวลาไทยอยู่แล้ว)
    const sql = `INSERT INTO project_feature_notes (feature_id, content, created_by, attachment, attachment_type, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
    db.query(sql, [featureId, content, user, attachment, attachmentType], (err, result) => {
        if (err) { console.error(err); return res.status(500).json(err); }
        
        // Log และแจ้งเตือน
        logAction(featureId, 'UPDATE', user, `เพิ่มบันทึกในงาน #${featureId}: ${content ? content.substring(0, 20) : 'รูปภาพ'}...`);
        res.json({ id: result.insertId, content, created_by: user, attachment, attachment_type: attachmentType, created_at: new Date() });
    });
});

// --- Quick Notes (Sticky Notes) ---
app.get('/api/notes', authenticateToken, (req, res) => {
    db.query('SELECT * FROM quick_notes WHERE created_by = ? ORDER BY created_at DESC', [req.user.username], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});
app.post('/api/notes', authenticateToken, (req, res) => {
    db.query('INSERT INTO quick_notes (content, created_by, created_at) VALUES (?, ?, NOW())', [req.body.content, req.user.username], (err, result) => {
        if (err) return res.status(500).json(err);
        logAction(result.insertId, 'CREATE', req.user.fullname, 'สร้างบันทึกช่วยจำ');
        res.json({ id: result.insertId, content: req.body.content, created_by: req.user.username });
    });
});
app.delete('/api/notes/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM quick_notes WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        logAction(req.params.id, 'DELETE', req.user.fullname, 'ลบบันทึกช่วยจำ');
        res.json({ message: 'Deleted' });
    });
});
app.put('/api/notes/:id', authenticateToken, (req, res) => {
    db.query('UPDATE quick_notes SET content = ? WHERE id = ? AND created_by = ?', [req.body.content, req.params.id, req.user.username], (err) => {
        if (err) return res.status(500).json(err);
        logAction(req.params.id, 'UPDATE', req.user.fullname, 'แก้ไขบันทึกช่วยจำ');
        res.json({ message: 'Updated' });
    });
});

// --- Profile ---
app.put('/api/profile', authenticateToken, (req, res) => {
    const { fullname } = req.body;
    db.query('UPDATE users SET fullname = ? WHERE id = ?', [fullname, req.user.id], (err) => {
        if (err) return res.status(500).json(err);
        logAction(req.user.id, 'UPDATE', req.user.username, 'แก้ไขข้อมูลส่วนตัว');
        res.json({ message: 'Updated', user: { ...req.user, fullname } });
    });
});
app.put('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    db.query('SELECT password FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err || results.length === 0 || results[0].password !== currentPassword) return res.status(401).json({ message: 'รหัสผิด' });
        db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, req.user.id], (err) => {
            if (err) return res.status(500).json(err);
            logAction(req.user.id, 'UPDATE', req.user.username, 'เปลี่ยนรหัสผ่าน');
            res.json({ message: 'Changed' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});