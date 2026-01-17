const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Built-in body parser for JSON
app.use(express.urlencoded({ extended: true })); // For form data if needed
app.use(express.static(path.join(__dirname, 'public')));

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - [${req.method}] ${req.url}`);
    next();
});

// --- API Routes ---

// Login Endpoint
app.post('/api/login', (req, res) => {
    let { username, password, role } = req.body;

    console.log('Login Request:', { username, password, role }); // Console log for debugging

    if (!username || !password || !role) {
        return res.status(400).json({ error: "الرجاء إدخال جميع البيانات المطلوبة" });
    }

    username = username.trim();
    password = password.trim();

    if (role === 'admin') {
        const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
        db.get(query, ['admin', password], (err, row) => {
            if (err) {
                console.error("DB Error (Admin Login):", err);
                return res.status(500).json({ error: "حدث خطأ في الخادم" });
            }
            if (row) {
                console.log("Admin Login Success");
                res.json({ success: true, user: 'admin', role: 'admin' });
            } else {
                console.log("Admin Login Failed: Invalid Credentials");
                res.status(401).json({ error: "كلمة مرور المدير غير صحيحة" });
            }
        });
    } else {
        // Employee Login
        const query = 'SELECT * FROM employees WHERE name = ? AND password = ?';
        db.get(query, [username, password], (err, row) => {
            if (err) {
                console.error("DB Error (Employee Login):", err);
                return res.status(500).json({ error: "حدث خطأ في الخادم" });
            }
            if (row) {
                console.log(`Employee Login Success: ${username}`);
                res.json({ success: true, user: row.name, role: 'employee', id: row.id });
            } else {
                console.log(`Employee Login Failed: ${username}`);
                res.status(401).json({ error: "كلمة مرور الموظف غير صحيحة" });
            }
        });
    }
});

// Change Password Endpoint
app.post('/api/change-password', (req, res) => {
    const { username, oldPassword, newPassword, role } = req.body;

    if (!username || !oldPassword || !newPassword || !role) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }

    if (role === 'admin') {
        db.get('SELECT * FROM users WHERE username = ? AND password = ?', ['admin', oldPassword], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) {
                db.run('UPDATE users SET password = ? WHERE username = ?', [newPassword, 'admin'], function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                });
            } else {
                res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
            }
        });
    } else {
        db.get('SELECT * FROM employees WHERE name = ? AND password = ?', [username, oldPassword], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) {
                db.run('UPDATE employees SET password = ? WHERE name = ?', [newPassword, username], function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                });
            } else {
                res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
            }
        });
    }
});
// Emergency Password Reset
app.post('/api/admin/reset-password', (req, res) => {
    const { recoveryKey } = req.body;
    const EMERGENCY_KEY = 'admin_recovery_2024';

    if (recoveryKey === EMERGENCY_KEY) {
        db.run("UPDATE users SET password = '1234' WHERE username = 'admin'", function (err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log("Admin password reset via emergency key");
            res.json({ success: true, message: "تمت إعادة تعيين كلمة مرور المدير إلى: 1234" });
        });
    } else {
        res.status(401).json({ error: "مفتاح الاستعادة غير صحيح" });
    }
});

// --- Records APIs ---

app.get('/api/records', (req, res) => {
    const { from, to, department, capacity, description, day } = req.query;
    let sql = "SELECT * FROM records WHERE 1=1";
    const params = [];

    if (from) { sql += " AND date >= ?"; params.push(from); }
    if (to) { sql += " AND date <= ?"; params.push(to); }
    if (department) { sql += " AND department = ?"; params.push(department); }
    if (capacity) { sql += " AND capacity = ?"; params.push(capacity); }
    if (description) { sql += " AND description = ?"; params.push(description); }
    if (day) { sql += " AND day = ?"; params.push(day); }

    sql += " ORDER BY date DESC, created_at DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", data: rows });
    });
});

app.post('/api/records', (req, res) => {
    const { day, date, beneficiary_name, id_number, phone_number, case_number, department, capacity, description, employee } = req.body;

    const sql = `INSERT INTO records (day, date, beneficiary_name, id_number, phone_number, case_number, department, capacity, description, employee, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [day, date, beneficiary_name, id_number, phone_number, case_number, department, capacity, description, employee, new Date().toISOString()];

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "success", id: this.lastID });
    });
});

app.post('/api/records/bulk', (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "No records provided" });
    }

    const placeholder = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const sql = `INSERT INTO records (day, date, beneficiary_name, id_number, phone_number, case_number, department, capacity, description, employee, created_at) VALUES ` +
        records.map(() => placeholder).join(',');

    const params = [];
    const now = new Date().toISOString();

    records.forEach(r => {
        params.push(r.day, r.date, r.beneficiary_name, r.id_number, r.phone_number, r.case_number, r.department, r.capacity, r.description, r.employee, now);
    });

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", count: this.changes });
    });
});

app.delete('/api/records/:id', (req, res) => {
    db.run('DELETE FROM records WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted", changes: this.changes });
    });
});

// --- Settings APIs --- (Keeping these simple/standard)

// Departments
app.get('/api/settings/departments', (req, res) => {
    db.all("SELECT * FROM departments ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/settings/departments', (req, res) => {
    const { name } = req.body;
    db.run('INSERT INTO departments (name) VALUES (?)', [name], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});
app.delete('/api/settings/departments/:id', (req, res) => {
    db.run('DELETE FROM departments WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted" });
    });
});

// Employees
app.get('/api/settings/employees', (req, res) => {
    db.all("SELECT * FROM employees ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/settings/employees', (req, res) => {
    const { name } = req.body;
    db.run('INSERT INTO employees (name, password) VALUES (?, ?)', [name, '1234'], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});
app.delete('/api/settings/employees/:id', (req, res) => {
    db.run('DELETE FROM employees WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted" });
    });
});

// Capacities
app.get('/api/settings/capacities', (req, res) => {
    db.all("SELECT * FROM capacities ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/settings/capacities', (req, res) => {
    const { name } = req.body;
    db.run('INSERT INTO capacities (name) VALUES (?)', [name], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});
app.delete('/api/settings/capacities/:id', (req, res) => {
    db.run('DELETE FROM capacities WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted" });
    });
});

// Descriptions
app.get('/api/settings/descriptions', (req, res) => {
    db.all("SELECT * FROM descriptions ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/settings/descriptions', (req, res) => {
    const { name } = req.body;
    db.run('INSERT INTO descriptions (name) VALUES (?)', [name], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});
app.delete('/api/settings/descriptions/:id', (req, res) => {
    db.run('DELETE FROM descriptions WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted" });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
