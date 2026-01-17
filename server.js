const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// تحديد مسار قاعدة البيانات حسب البيئة
const isProduction = process.env.NODE_ENV === 'production';
const dbDir = isProduction ? '/opt/render/project/src/data' : __dirname;
const dbPath = path.join(dbDir, 'court_stats.db');

// إنشاء المجلد إذا لم يكن موجوداً
if (isProduction && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log('🗄️ مسار قاعدة البيانات:', dbPath);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        initializeDatabase();
    }
});

// تهيئة قاعدة البيانات
function initializeDatabase() {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (!row) {
            console.log('📝 جاري إنشاء الجداول...');
            createTables();
        } else {
            console.log('✅ الجداول موجودة بالفعل');
        }
    });
}

// إنشاء الجداول
function createTables() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            console.log('✅ تم إنشاء جدول المستخدمين');
            insertDefaultUsers();
        });
        
        db.run(`CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            console.log('✅ تم إنشاء جدول الدوائر');
            insertDefaultDepartments();
        });
        
        db.run(`CREATE TABLE IF NOT EXISTS statuses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            console.log('✅ تم إنشاء جدول الصفات');
            insertDefaultStatuses();
        });
        
        db.run(`CREATE TABLE IF NOT EXISTS reasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            console.log('✅ تم إنشاء جدول الأسباب');
            insertDefaultReasons();
        });
        
        db.run(`CREATE TABLE IF NOT EXISTS beneficiaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            id_number TEXT NOT NULL,
            case_number TEXT NOT NULL,
            department TEXT NOT NULL,
            status TEXT,
            reason TEXT,
            date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER
        )`, () => {
            console.log('✅ تم إنشاء جدول المستفيدين');
        });
    });
}

function insertDefaultUsers() {
    const users = [
        { username: 'admin', password: '1234', role: 'admin' },
        { username: 'entry', password: '1234', role: 'employee' }
    ];
    const stmt = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
    users.forEach(u => stmt.run(u.username, u.password, u.role));
    stmt.finalize();
}

function insertDefaultDepartments() {
    const depts = ['الدائرة الأولى', 'الدائرة الثانية', 'الدائرة الثالثة', 'الدائرة الرابعة', 'دائرة الأحوال الشخصية'];
    const stmt = db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)');
    depts.forEach(d => stmt.run(d));
    stmt.finalize();
}

function insertDefaultStatuses() {
    const statuses = ['مدعي', 'مدعى عليه', 'موكل', 'شاهد', 'خبير'];
    const stmt = db.prepare('INSERT OR IGNORE INTO statuses (name) VALUES (?)');
    statuses.forEach(s => stmt.run(s));
    stmt.finalize();
}

function insertDefaultReasons() {
    const reasons = ['جلسة', 'استلام حكم', 'تسليم مذكرة', 'إيداع صحيفة', 'استعلام'];
    const stmt = db.prepare('INSERT OR IGNORE INTO reasons (name) VALUES (?)');
    reasons.forEach(r => stmt.run(r));
    stmt.finalize();
}

// ========== API Endpoints ==========

// تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log('📝 محاولة تسجيل دخول:', username);
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }
    
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        }
        if (user) {
            console.log('✅ تسجيل دخول ناجح:', user.username);
            res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
        } else {
            res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
    });
});

// جلب المستخدمين
app.get('/api/users', (req, res) => {
    db.all('SELECT id, username, role FROM users', [], (err, users) => {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, users });
    });
});

// إضافة مستخدم
app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }
    
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ success: false, message: 'اسم المستخدم موجود' });
            }
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        }
        res.json({ success: true, message: 'تم إضافة المستخدم', userId: this.lastID });
    });
});

// حذف مستخدم
app.delete('/api/users/:id', (req, res) => {
    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, message: 'تم حذف المستخدم' });
    });
});

// جلب الدوائر
app.get('/api/departments', (req, res) => {
    db.all('SELECT * FROM departments ORDER BY name', [], (err, depts) => {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, departments: depts });
    });
});

// إضافة دائرة
app.post('/api/departments', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'اسم الدائرة مطلوب' });
    
    db.run('INSERT INTO departments (name) VALUES (?)', [name], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, message: 'تم إضافة الدائرة', departmentId: this.lastID });
    });
});

// حذف دائرة
app.delete('/api/departments/:id', (req, res) => {
    db.run('DELETE FROM departments WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, message: 'تم حذف الدائرة' });
    });
});

// جلب الصفات
app.get('/api/statuses', (req, res) => {
    db.all('SELECT * FROM statuses ORDER BY name', [], (err, items) => {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, statuses: items });
    });
});

// جلب الأسباب
app.get('/api/reasons', (req, res) => {
    db.all('SELECT * FROM reasons ORDER BY name', [], (err, items) => {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, reasons: items });
    });
});

// إضافة مستفيد
app.post('/api/beneficiaries', (req, res) => {
    const { name, id_number, case_number, department, status, reason, date } = req.body;
    if (!name || !id_number || !case_number || !department) {
        return res.status(400).json({ success: false, message: 'الحقول الأساسية مطلوبة' });
    }
    
    db.run('INSERT INTO beneficiaries (name, id_number, case_number, department, status, reason, date) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [name, id_number, case_number, department, status, reason, date || new Date().toISOString().split('T')[0]], 
        function(err) {
            if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            res.json({ success: true, message: 'تم إضافة المستفيد', beneficiaryId: this.lastID });
        }
    );
});

// جلب المستفيدين
app.get('/api/beneficiaries', (req, res) => {
    const { date, department } = req.query;
    let query = 'SELECT * FROM beneficiaries WHERE 1=1';
    const params = [];
    
    if (date) {
        query += ' AND date = ?';
        params.push(date);
    }
    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }
    query += ' ORDER BY date DESC, id DESC';
    
    db.all(query, params, (err, items) => {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, beneficiaries: items });
    });
});

// جلب الإحصائيات
app.get('/api/statistics', (req, res) => {
    const { startDate, endDate, department } = req.query;
    let query = 'SELECT COUNT(*) as count, department, status FROM beneficiaries WHERE 1=1';
    const params = [];
    
    if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
    }
    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }
    query += ' GROUP BY department, status';
    
    db.all(query, params, (err, stats) => {
        if (err) return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        res.json({ success: true, statistics: stats });
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`📊 البيئة: ${process.env.NODE_ENV || 'development'}`);
});

// معالجة الأخطاء
process.on('uncaughtException', (err) => console.error('❌ خطأ:', err));
process.on('SIGTERM', () => {
    db.close();
    process.exit(0);
});
