const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'beneficiaries.db');
const db = new sqlite3.Database(dbPath);

console.log("--- Inspecting Users ---");
db.all("SELECT id, username, password FROM users", (err, rows) => {
    if (err) console.error(err);
    rows.forEach(row => {
        console.log(`User: '${row.username}'`);
        console.log(`  Username Chars: ${[...row.username].map(c => c.charCodeAt(0)).join(', ')}`);
        console.log(`  Password Chars: ${[...row.password].map(c => c.charCodeAt(0)).join(', ')}`);
    });

    // Reset Admin
    console.log("\n--- Resetting Admin ---");
    db.run("UPDATE users SET password = '1234', username = 'admin' WHERE id = 1", function (err) {
        if (err) console.log(err);
        else console.log(`Admin reset. Changes: ${this.changes}`);

        // Re-verify
        db.all("SELECT id, username, password FROM users WHERE id=1", (err, rows) => {
            console.log("New Admin State:", rows);
        });
    });
});
