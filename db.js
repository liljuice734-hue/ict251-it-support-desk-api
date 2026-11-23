const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Pool } = require("pg");

const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
const seed = readFileSync(join(__dirname, "seed.sql"), "utf8");

async function initialiseDatabase(pool) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(schema);
        const marker = await client.query(
            "SELECT key FROM app_metadata WHERE key = $1",
            ["seed-v1"]
        );
        if (marker.rowCount === 0) {
            await client.query("INSERT INTO app_metadata (key) VALUES ($1)", ["seed-v1"]);
            await client.query(seed);
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function openDatabase(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error("DATABASE_URL must be set to a PostgreSQL connection URL.");
    const pool = new Pool({ connectionString });
    try {
        await initialiseDatabase(pool);
        return pool;
    } catch (error) {
        await pool.end();
        throw error;
    }
}

module.exports = { initialiseDatabase, openDatabase };
