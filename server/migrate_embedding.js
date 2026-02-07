
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'registry.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Adding embedding column to fingerprints table...");
    db.run(`ALTER TABLE fingerprints ADD COLUMN embedding TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column 'embedding' already exists.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("Column 'embedding' added successfully.");
        }
    });
});

db.close();
