const { Router } = require("express");

const allowedStatuses = ["Pending", "In progress", "Completed"];
const fields = [
    ["title", value => value.length >= 3 && value.length <= 80, "Title must contain 3 to 80 characters."],
    ["category", value => value.length >= 2 && value.length <= 40, "Category must contain 2 to 40 characters."],
    ["description", value => value.length >= 5 && value.length <= 300, "Description must contain 5 to 300 characters."],
    ["status", value => allowedStatuses.includes(value), "Status must be Pending, In progress, or Completed."]
];

function inputError(message) {
    return Object.assign(new Error(message), { status: 400 });
}

function readInput(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw inputError("Send a JSON object with title, category, description, and status.");
    }

    return fields.map(([name, isValid, message]) => {
        if (typeof body[name] !== "string") throw inputError(name + " must be text.");
        const value = body[name].trim();
        if (!isValid(value)) throw inputError(message);
        return value;
    });
}

function readId(raw) {
    const id = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) {
        throw inputError("Record ID must be a positive whole number.");
    }
    return id;
}

function createRecordsRouter(db) {
    const router = Router();
    const columns = "id, title, category, description, status";
    router.get("/", async (req, res, next) => {
        try {
            const result = await db.query("SELECT " + columns + " FROM records ORDER BY id");
            res.json(result.rows);
        } catch (error) { next(error); }
    });

    router.get("/:id", async (req, res, next) => {
        try {
            const result = await db.query("SELECT " + columns + " FROM records WHERE id = $1", [readId(req.params.id)]);
            return result.rowCount ? res.json(result.rows[0]) : res.status(404).json({ message: "Record not found." });
        } catch (error) { next(error); }
    });

    router.post("/", async (req, res, next) => {
        try {
            const result = await db.query("INSERT INTO records (title, category, description, status) VALUES ($1, $2, $3, $4) RETURNING " + columns, readInput(req.body));
            res.status(201).json(result.rows[0]);
        } catch (error) { next(error); }
    });

    router.put("/:id", async (req, res, next) => {
        try {
            const values = [...readInput(req.body), readId(req.params.id)];
            const result = await db.query("UPDATE records SET title = $1, category = $2, description = $3, status = $4 WHERE id = $5 RETURNING " + columns, values);
            return result.rowCount ? res.json(result.rows[0]) : res.status(404).json({ message: "Record not found." });
        } catch (error) { next(error); }
    });

    router.delete("/:id", async (req, res, next) => {
        try {
            const result = await db.query("DELETE FROM records WHERE id = $1 RETURNING id", [readId(req.params.id)]);
            if (result.rowCount === 0) return res.status(404).json({ message: "Record not found." });
            return res.json({ message: "Record deleted." });
        } catch (error) { next(error); }
    });
    return router;
}

module.exports = { createRecordsRouter };
