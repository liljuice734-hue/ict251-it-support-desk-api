const { DatabaseSync } = require("node:sqlite");
const { mkdirSync, readFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

function openDatabase(databasePath) {
    const filename = databasePath === ":memory:" ? databasePath : resolve(databasePath);
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });

    const db = new DatabaseSync(filename);
    try {
        db.exec("PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE");
        db.exec(readFileSync(join(__dirname, "schema.sql"), "utf8"));
        const marker = db.prepare("INSERT OR IGNORE INTO app_metadata (key) VALUES (?)").run("seed-v1");
        if (marker.changes === 1 && db.prepare("SELECT 1 FROM records LIMIT 1").get() === undefined) {
            db.exec(readFileSync(join(__dirname, "seed.sql"), "utf8"));
        }
        db.exec("COMMIT");
        return db;
    } catch (error) {
        db.close();
        throw error;
    }
}

module.exports = { openDatabase };
