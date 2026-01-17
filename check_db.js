const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'beneficiaries.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    console.log("Checking 'users' table (Detailed):");
    db.all("SELECT id, username, password FROM users", (err, rows) => {
        if (err) {
            console.error("Error querying users:", err);
        } else {
            rows.forEach(row => {
                console.log(`User: '${row.username}'`);
                console.log(`  Password: '${row.password}' (Length: ${row.password.length})`);
                console.log(`  Password Chars: ${[...row.password].map(c => c.charCodeAt(0)).join(', ')}`);
            });
        }
    });
});
