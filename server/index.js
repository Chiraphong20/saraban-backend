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

// --- Middleware: ตรวจสอบ Token และดึงข้อมูล User ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // ใน user จะมี { id, username, fullname, role }
        next();
    });
};

// --- Helper: ฟังก์ชันบันทึก Log (ใช้ภายในไฟล์นี้) ---
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
    const sql = 'SELECT * FROM users WHERE username = ?';
    
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: 'User not found' });

        const user = results[0];
        // เช็ค Password (Plain text)
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
    
    // แปลงค่าว่างเป็น NULL หรือ 0
    const sDate = startDate === "" ? null : startDate;
    const eDate = endDate === "" ? null : endDate;
    const budg = (budget === "" || budget === null) ? 0 : budget;

    const sql = 'INSERT INTO projects (code, name, description, owner, budget, status, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    db.query(sql, [code, name, description, owner, budg, status, sDate, eDate], (err, result) => {
        if (err) return res.status(500).json(err);
        
        const newId = result.insertId;
        // บันทึก Log สร้าง
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
        
        // บันทึก Log แก้ไข
        logAction(id, 'UPDATE', req.user.fullname, `แก้ไขข้อมูลโครงการ: ${name} (สถานะ: ${status})`);
        
        res.json({ message: 'Updated successfully' });
    });
});

// 🔥 Delete Project (แบบพิเศษ: บันทึก Log ก่อนลบ)
app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const actor = req.user.fullname || req.user.username || 'Unknown';

    // 1. ดึงข้อมูลโครงการก่อนลบ เพื่อเอาชื่อมาเก็บ Log
    const getProjectSql = 'SELECT code, name FROM projects WHERE id = ?';
    db.query(getProjectSql, [projectId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Project not found' });

        const project = results[0];
        const logDetail = `ลบโครงการ: ${project.code} - ${project.name}`;

        // 2. บันทึก Log การลบ (ใส่ entity_id เป็น ID เดิมที่ถูกลบไปแล้ว)
        const logSql = 'INSERT INTO audit_logs (entity_id, action, actor, details, timestamp) VALUES (?, ?, ?, ?, NOW())';
        db.query(logSql, [projectId, 'DELETE', actor, logDetail], (logErr) => {
            if (logErr) console.error('Failed to log deletion:', logErr);

            // 3. ลบโครงการจริง
            const deleteSql = 'DELETE FROM projects WHERE id = ?';
            db.query(deleteSql, [projectId], (delErr) => {
                if (delErr) return res.status(500).json(delErr);
                res.json({ message: 'Deleted and logged successfully' });
            });
        });
    });
});

// --- Timeline & Logs Routes ---

// 1. ดึง Log ของโปรเจกต์รายตัว (Timeline)
app.get('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC';
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. เพิ่ม Note ลงใน Timeline
app.post('/api/projects/:id/logs', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { note, action } = req.body; 
    const actor = req.user.fullname;
    const actionType = action || 'NOTE'; // ถ้าไม่ส่ง action มา ให้เป็น NOTE

    logAction(id, actionType, actor, note);
    res.json({ message: 'Log added successfully' });
});

// 3. ดึง Log ทั้งหมด (สำหรับหน้า AuditLogViewer)
app.get('/api/audit-logs', authenticateToken, (req, res) => {
    // ดึง Log ทั้งหมดเรียงตามเวลาล่าสุด
    const sql = 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000'; 
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});
// --- Notification Route ---
// ดึง 20 กิจกรรมล่าสุดเพื่อแสดงเป็น Notification
app.get('/api/notifications', authenticateToken, (req, res) => {
    // เลือกข้อมูลที่จำเป็น และ Join เพื่อเอารหัสโครงการมาแสดง (ถ้ามี)
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

// 1. อัปเดตข้อมูลส่วนตัว (ชื่อ-นามสกุล)
app.put('/api/profile', authenticateToken, (req, res) => {
    const { fullname } = req.body;
    const userId = req.user.id;

    const sql = 'UPDATE users SET fullname = ? WHERE id = ?';
    db.query(sql, [fullname, userId], (err, result) => {
        if (err) return res.status(500).json(err);
        
        // บันทึก Log
        logAction(userId, 'UPDATE', req.user.username, 'แก้ไขข้อมูลส่วนตัว');
        
        // ส่งข้อมูลใหม่กลับไป
        res.json({ message: 'Profile updated successfully', user: { ...req.user, fullname } });
    });
});

// 2. เปลี่ยนรหัสผ่าน (Change Password)
app.put('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // 1. เช็คว่ารหัสเดิมถูกไหม
    db.query('SELECT password FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        
        if (results.length === 0 || results[0].password !== currentPassword) {
            return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }

        // 2. อัปเดตรหัสใหม่
        db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId], (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);
            
            logAction(userId, 'UPDATE', req.user.username, 'ทำการเปลี่ยนรหัสผ่าน');
            res.json({ message: 'Password changed successfully' });
        });
    });
});
// --- Project Features / Plan Routes ---

// 1. ดึง Features ของโปรเจกต์ (เพื่อไปวาด Timeline)
app.get('/api/projects/:id/features', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const sql = 'SELECT * FROM project_features WHERE project_id = ? ORDER BY start_date ASC';
    db.query(sql, [projectId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. เพิ่ม Feature ใหม่ (Plan งาน)
app.post('/api/projects/:id/features', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;
    const note_by = req.user.username; // ดึงชื่อคน login มาใส่

    const sql = `
        INSERT INTO project_features 
        (project_id, title, detail, next_list, status, start_date, due_date, remark, note_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [projectId, title, detail, next_list, status, start_date, due_date, remark, note_by], (err, result) => {
        if (err) return res.status(500).json(err);
        
        // (Option) บันทึก Log ว่ามีการเพิ่มแผนงาน
        logAction(projectId, 'PLAN', req.user.username, `เพิ่มแผนงาน: ${title}`);
        
        res.json({ message: 'Feature added successfully', id: result.insertId });
    });
});
// --- Project Features Routes (เพิ่มเติม) ---

// 3. แก้ไข Feature (Update)
app.put('/api/features/:id', authenticateToken, (req, res) => {
    const featureId = req.params.id;
    const { title, detail, next_list, status, start_date, due_date, remark } = req.body;
    const note_by = req.user.username; // อัปเดตชื่อคนแก้ไขล่าสุด

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

// 4. ลบ Feature (Delete)
app.delete('/api/features/:id', authenticateToken, (req, res) => {
    const featureId = req.params.id;
    const sql = 'DELETE FROM project_features WHERE id=?';

    db.query(sql, [featureId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Feature deleted successfully' });
    });
});
// --- Quick Notes Routes ---

// 1. ดึง Note ทั้งหมดของ user
app.get('/api/notes', authenticateToken, (req, res) => {
    const username = req.user.username;
    // ดึงเฉพาะของตัวเอง
    db.query('SELECT * FROM quick_notes WHERE created_by = ? ORDER BY created_at DESC', [username], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. สร้าง Note ใหม่
app.post('/api/notes', authenticateToken, (req, res) => {
    const { content } = req.body;
    const username = req.user.username;
    
    db.query('INSERT INTO quick_notes (content, created_by) VALUES (?, ?)', [content, username], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ id: result.insertId, content, created_by: username });
    });
});

// 3. ลบ Note
app.delete('/api/notes/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM quick_notes WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Deleted' });
    });
});
// --- Quick Notes Routes (เพิ่มเติม) ---

// 4. แก้ไข Note (Update) ✅ เพิ่มอันนี้เข้าไป
app.put('/api/notes/:id', authenticateToken, (req, res) => {
    const { content } = req.body;
    const noteId = req.params.id;
    const username = req.user.username; // ตรวจสอบว่าเป็นเจ้าของ note หรือไม่

    const sql = 'UPDATE quick_notes SET content = ? WHERE id = ? AND created_by = ?';
    
    db.query(sql, [content, noteId, username], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Note updated successfully', content });
    });
});
// --- Project Features (Timeline) Routes ---

// 1. ดึงข้อมูล Timeline ของโครงการ
app.get('/api/projects/:id/features', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const sql = 'SELECT * FROM project_features WHERE project_id = ? ORDER BY start_date ASC';
    db.query(sql, [projectId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. เพิ่มรายการเข้า Timeline (ใช้ทั้งตอนย้าย Note และเพิ่มเอง)
app.post('/api/projects/:id/features', authenticateToken, (req, res) => {
    const projectId = req.params.id;
    const { title, status, start_date, due_date } = req.body;
    
    // Default values
    const detail = req.body.detail || '';
    const remark = req.body.remark || '';
    
    const sql = `
        INSERT INTO project_features 
        (project_id, title, detail, status, start_date, due_date, remark) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [projectId, title, detail, status, start_date, due_date, remark], (err, result) => {
        if (err) return res.status(500).json(err);
        
        // Log การกระทำ
        const logSql = 'INSERT INTO audit_logs (user_id, action, details, project_id) VALUES (?, ?, ?, ?)';
        db.query(logSql, [req.user.id, 'CREATE', `เพิ่มแผนงาน: ${title}`, projectId]);

        res.json({ id: result.insertId, ...req.body });
    });
});

// 3. ลบรายการจาก Timeline
app.delete('/api/features/:id', authenticateToken, (req, res) => {
    const featureId = req.params.id;
    const sql = 'DELETE FROM project_features WHERE id = ?';
    db.query(sql, [featureId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Deleted successfully' });
    });
});
// --- Feature Notes Routes ---

// 1. ดึง Notes ทั้งหมดของ Feature หนึ่งๆ
app.get('/api/features/:id/notes', authenticateToken, (req, res) => {
    db.query('SELECT * FROM feature_notes WHERE feature_id = ? ORDER BY created_at DESC', [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. เพิ่ม Note ให้ Feature (ใช้ทั้งหน้า Timeline และย้ายจาก Dashboard)
app.post('/api/features/:id/notes', authenticateToken, (req, res) => {
    const featureId = req.params.id;
    const { content } = req.body;
    const user = req.user.username;

    db.query('INSERT INTO feature_notes (feature_id, content, created_by) VALUES (?, ?, ?)', 
    [featureId, content, user], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ id: result.insertId, content, created_by: user, created_at: new Date() });
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});