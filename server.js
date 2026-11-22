const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { join } = require("node:path");
const { openDatabase } = require("./db");
const { createRecordsRouter } = require("./routes/records");

function createApp(db, origins = []) {
    const app = express();
    app.disable("x-powered-by");
    app.use(cors({ origin: origins }));
    app.use(express.json({ limit: "16kb" }));

    app.get("/", (req, res) => res.sendFile(join(__dirname, "guide.html")));
    app.get("/health", (req, res) => {
        try {
            db.prepare("SELECT COUNT(*) FROM records").get();
            res.json({ status: "ok", database: "connected" });
        } catch (error) {
            console.error("Database health check failed:", error);
            res.status(503).json({ message: "Database unavailable." });
        }
    });
    app.use("/api/records", createRecordsRouter(db));

    app.use((req, res) => res.status(404).json({ message: "Route not found." }));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        if (error.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body." });
        if (error.type === "entity.too.large") return res.status(413).json({ message: "Request body is too large." });
        if (error.status === 400) return res.status(400).json({ message: error.message });
        if (error.status === 415) return res.status(415).json({ message: "Unsupported request encoding or character set." });
        console.error("Unexpected API error:", error);
        return res.status(500).json({ message: "An unexpected server error occurred." });
    });
    return app;
}

if (require.main === module) {
    dotenv.config({ quiet: true });
    const port = Number(process.env.PORT || 3000);
    const origins = (process.env.CLIENT_ORIGINS || "http://127.0.0.1:8000,http://localhost:8000")
        .split(",").map(value => value.trim()).filter(Boolean);
    const db = openDatabase(process.env.DATABASE_PATH || join(__dirname, "data", "records.sqlite"));
    const server = createApp(db, origins).listen(port, "0.0.0.0", () => {
        console.log("IT Support Desk API listening on port " + server.address().port);
    });
    for (const signal of ["SIGINT", "SIGTERM"]) {
        process.once(signal, () => server.close(() => db.close()));
    }
}

module.exports = { createApp };
