const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'beneficiaries.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Records table
        db.run(`CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT,
            date TEXT,
            beneficiary_name TEXT,
            id_number TEXT,
            phone_number TEXT,
            case_number TEXT,
            department TEXT,
            capacity TEXT,
            description TEXT,
            employee TEXT,
            created_at TEXT
        )`);

        // Users table (for admin and data entry)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (!err) {
                // Create default admin and entry users
                const insert = 'INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)';
                db.run(insert, ["admin", "1234"]);
                db.run(insert, ["entry", "1234"]);
            }
        });

        // Departments table
        db.run(`CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`, (err) => {
            if (!err) {
                const initialDepts = [
                    "الدائرة الأولى", "الدائرة الثانية", "الدائرة الثالثة", "الدائرة الرابعة",
                    "الدائرة الخامسة", "الدائرة السادسة", "الدائرة السابعة", "دائرة الأحداث", "غير مقيد"
                ];
                initialDepts.forEach(dept => {
                    db.run("INSERT OR IGNORE INTO departments (name) VALUES (?)", [dept]);
                });
            }
        });

        // Capacities table
        db.run(`CREATE TABLE IF NOT EXISTS capacities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`, (err) => {
            if (!err) {
                const initialCaps = [
                    "أصيل مدعي", "أصيل مدعى عليه", "وكيل مدعي", "وكيل مدعى عليه",
                    "محامي", "شاهد"
                ];
                initialCaps.forEach(cap => {
                    db.run("INSERT OR IGNORE INTO capacities (name) VALUES (?)", [cap]);
                });
            }
        });

        // Descriptions table (Reasons)
        db.run(`CREATE TABLE IF NOT EXISTS descriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`, (err) => {
            if (!err) {
                const initialDescs = [
                    "طلب الاطلاع على ملف القضية", "تقديم شكوى لمكتب فضيلة رئيس المحكمة",
                    "طلب صورة من صك الحكم (غير مرفق في المنصة التقنية)",
                    "الاستعلام عن (رقم القضية/ رقم الصك) بالحق العام لرفع الحق الخاص",
                    "الاستعلام عن رقم معاملة صادرة", "الاستعلام عن موعد الجلسة (لا تظهر في المنصة التقنية)",
                    "الاستعلام عن معاملة محالة من النيابة العامة", "تسليم بينة (مقطع مرئي/ صوتي - صور)",
                    "طلب تعديل حالة القضية إلى (قيد النظر) للتمكن من تقديم الطلبات عبر المنصة التقنية",
                    "طلب حضور جلسة لعدم وجود حساب (أبشر)", "طلب رابط حضور جلسة مرئية ( شاهد عام )",
                    "طلب اعتماد صك الحكم ( تجاوز مدة الاعتماد )", "الاستعلام عن حالة تبليغ الحكم",
                    "طلب رفع قرارات ( التبليغ بالمراجعة / أمر قبض )", "طلب حضور جلسة ( موقوف في مراكز الشرط )"
                ];
                initialDescs.forEach(desc => {
                    db.run("INSERT OR IGNORE INTO descriptions (name) VALUES (?)", [desc]);
                });
            }
        });

        // Employees table
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            password TEXT DEFAULT '1234'
        )`, (err) => {
            if (!err) {
                const initialEmployees = [
                    "علي الغامدي", "محمد الثبيتي", "فيصل الجهني", "متعب الصاعدي",
                    "أكرم الصبحي", "حميد السلمي", "هتان المطيري", "فهاد عسيري",
                    "خالد عريبي", "مانع السلمي"
                ];
                initialEmployees.forEach(emp => {
                    db.run("INSERT OR IGNORE INTO employees (name, password) VALUES (?, ?)", [emp, '1234']);
                });
            }
        });
    });
}

module.exports = db;
