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

// إنشاء المجلد إذا لم يكن موجوداً (للإنتاج)
if (isProduction && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log('🗄️ مسار قاعدة البيانات:', dbPath);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// تقديم الملفات الثابتة
if (fs.existsSync(path.join(__dirname, 'public'))) {
    app.use(express.static(path.join(__dirname, 'public')));
} else {
    app.use(express.static(__dirname));
}

// Database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        initializeDatabase();
    }
});

// تهيئة قاعدة البيانات إذا كانت فارغة
function initializeDatabase() {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
            console.error('❌ خطأ في فحص الجداول:', err);
        } else if (!row) {
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
        // جدول المستخدمين
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                console.log('✅ تم إنشاء جدول المستخدمين');
                insertDefaultUsers();
            }
        });
        
        // جدول الدوائر
        db.run(`CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                console.log('✅ تم إنشاء جدول الدوائر');
                insertDefaultDepartments();
            }
        });
        
        // جدول الصفات
        db.run(`CREATE TABLE IF NOT EXISTS statuses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                console.log('✅ تم إنشاء جدول الصفات');
                insertDefaultStatuses();
            }
        });
        
        // جدول الأسباب
        db.run(`CREATE TABLE IF NOT EXISTS reasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) console.log('✅ تم إنشاء جدول الأسباب');
        });
        
        // جدول المستفيدين
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
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`, (err) => {
            if (!err) console.log('✅ تم إنشاء جدول المستفيدين');
        });
    });
}

// إدراج المستخدمين الافتراضيين
function insertDefaultUsers() {
    const users = [
        { username: 'admin', password: '1234', role: 'admin' },
        { username: 'entry', password: '1234', role: 'employee' }
    ];
    
    const stmt = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
    users.forEach(user => {
        stmt.run(user.username, user.password, user.role, (err) => {
            if (!err) console.log(`✅ تم إضافة المستخدم: ${user.username}`);
        });
    });
    stmt.finalize();
}

// إدراج الدوائر الافتراضية
function insertDefaultDepartments() {
    const departments = [
        'الدائرة الأولى',
        'الدائرة الثانية',
        'الدائرة الثالثة',
        'الدائرة الرابعة',
        'دائرة الأحوال الشخصية',
        'الدائرة التجارية',
        'دائرة التنفيذ'
    ];
    
    const stmt = db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)');
    departments.forEach(dept => {
        stmt.run(dept);
    });
    stmt.finalize();
}

// إدراج الصفات الافتراضية
function insertDefaultStatuses() {
    const statuses = ['مدعي', 'مدعى عليه', 'موكل', 'شاهد', 'خبير', 'مترجم', 'ولي أمر'];
    
    const stmt = db.prepare('INSERT OR IGNORE INTO statuses (name) VALUES (?)');
    statuses.forEach(status => {
        stmt.run(status);
    });
    stmt.finalize();
}

// ====== API Endpoints ======

// تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('📝 محاولة تسجيل دخول:', username);
    
    if (!username || !password) {
        console.log('❌ بيانات ناقصة');
        return res.status(400).json({ 
            success: false, 
            message: 'اسم المستخدم وكلمة المرور مطلوبان' 
        });
    }
    
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    
    db.get(query, [username, password], (err, user) => {
        if (err) {
            console.error('❌ خطأ في قاعدة البيانات:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        if (user) {
            console.log('✅ تسجيل دخول ناجح:', user.username, '- الدور:', user.role);
            res.json({
                success: true,
                message: 'تم تسجيل الدخول بنجاح',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        } else {
            console.log('❌ بيانات دخول خاطئة');
            res.status(401).json({ 
                success: false, 
                message: 'اسم المستخدم أو كلمة المرور غير صحيحة' 
            });
        }
    });
});

// الحصول على جميع المستخدمين
app.get('/api/users', (req, res) => {
    const query = 'SELECT id, username, role FROM users';
    
    db.all(query, [], (err, users) => {
        if (err) {
            console.error('خطأ في جلب المستخدمين:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        res.json({
            success: true,
            users: users
        });
    });
});

// إضافة مستخدم جديد
app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
        return res.status(400).json({ 
            success: false, 
            message: 'جميع الحقول مطلوبة' 
        });
    }
    
    const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
    
    db.run(query, [username, password, role], function(err) {
        if (err) {
            console.error('خطأ في إضافة المستخدم:', err);
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'اسم المستخدم موجود بالفعل' 
                });
            }
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        res.json({
            success: true,
            message: 'تم إضافة المستخدم بنجاح',
            userId: this.lastID
        });
    });
});

// حذف مستخدم
app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    const query = 'DELETE FROM users WHERE id = ?';
    
    db.run(query, [userId], function(err) {
        if (err) {
            console.error('خطأ في حذف المستخدم:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'المستخدم غير موجود' 
            });
        }
        
        res.json({
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        });
    });
});

// إضافة بيانات مستفيد
app.post('/api/beneficiaries', (req, res) => {
    const { name, id_number, case_number, department, status, reason, date } = req.body;
    
    if (!name || !id_number || !case_number || !department) {
        return res.status(400).json({ 
            success: false, 
            message: 'الاسم، الهوية، القضية، والدائرة مطلوبة' 
        });
    }
    
    const query = `INSERT INTO beneficiaries 
        (name, id_number, case_number, department, status, reason, date) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [name, id_number, case_number, department, status, reason, date], function(err) {
        if (err) {
            console.error('خطأ في إضافة المستفيد:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        res.json({
            success: true,
            message: 'تم إضافة بيانات المستفيد بنجاح',
            beneficiaryId: this.lastID
        });
    });
});

// الحصول على جميع المستفيدين
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
    
    db.all(query, params, (err, beneficiaries) => {
        if (err) {
            console.error('خطأ في جلب المستفيدين:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        res.json({
            success: true,
            beneficiaries: beneficiaries
        });
    });
});

// الحصول على الإحصائيات
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
        if (err) {
            console.error('خطأ في جلب الإحصائيات:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        res.json({
            success: true,
            statistics: stats
        });
    });
});

// الحصول على الدوائر
app.get('/api/departments', (req, res) => {
    const query = 'SELECT * FROM departments ORDER BY name';
    
    db.all(query, [], (err, departments) => {
        if (err) {
            console.error('خطأ في جلب الدوائر:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        res.json({
            success: true,
            departments: departments
        });
    });
});

// إضافة دائرة
app.post('/api/departments', (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        return res.status(400).json({ 
            success: false, 
            message: 'اسم الدائرة مطلوب' 
        });
    }
    
    const query = 'INSERT INTO departments (name) VALUES (?)';
    
    db.run(query, [name], function(err) {
        if (err) {
            console.error('خطأ في إضافة الدائرة:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        res.json({
            success: true,
            message: 'تم إضافة الدائرة بنجاح',
            departmentId: this.lastID
        });
    });
});

// حذف دائرة
app.delete('/api/departments/:id', (req, res) => {
    const deptId = req.params.id;
    
    const query = 'DELETE FROM departments WHERE id = ?';
    
    db.run(query, [deptId], function(err) {
        if (err) {
            console.error('خطأ في حذف الدائرة:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'خطأ في الخادم' 
            });
        }
        
        res.json({
            success: true,
            message: 'تم حذف الدائرة بنجاح'
        });
    });
});

// Health check endpoint لـ Render
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    const indexPath = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
        ? path.join(__dirname, 'public', 'index.html')
        : path.join(__dirname, 'index.html');
    
    res.sendFile(indexPath);
});

// معالجة 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`📊 نظام إدارة المستفيدين جاهز للاستخدام`);
    console.log(`🌍 البيئة: ${process.env.NODE_ENV || 'development'}`);
});

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (err) => {
    console.error('❌ خطأ غير متوقع:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Promise غير معالج:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 إيقاف الخادم...');
    db.close((err) => {
        if (err) {
            console.error('خطأ في إغلاق قاعدة البيانات:', err);
        }
        process.exit(0);
    });
});
