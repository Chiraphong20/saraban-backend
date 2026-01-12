// เปลี่ยนส่วนการเชื่อมต่อ Database เป็นแบบนี้
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saraban_track',
    port: process.env.DB_PORT || 3306,
    // เพิ่มบรรทัดนี้เพื่อป้องกันเน็ตหลุดแล้วค้าง
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});