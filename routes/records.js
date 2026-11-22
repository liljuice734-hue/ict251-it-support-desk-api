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
    const list = db.prepare("SELECT " + columns + " FROM records ORDER BY id");
    const get = db.prepare("SELECT " + columns + " FROM records WHERE id = ?");
    const create = db.prepare("INSERT INTO records (title, category, description, status) VALUES (?, ?, ?, ?) RETURNING " + columns);
    const update = db.prepare("UPDATE records SET title = ?, category = ?, description = ?, status = ? WHERE id = ? RETURNING " + columns);
    const remove = db.prepare("DELETE FROM records WHERE id = ?");

    router.get("/", (req, res) => res.json(list.all()));

    router.get("/:id", (req, res) => {
        const record = get.get(readId(req.params.id));
        return record ? res.json(record) : res.status(404).json({ message: "Record not found." });
    });

    router.post("/", (req, res) => res.status(201).json(create.get(...readInput(req.body))));

    router.put("/:id", (req, res) => {
        const id = readId(req.params.id);
        const record = update.get(...readInput(req.body), id);
        return record ? res.json(record) : res.status(404).json({ message: "Record not found." });
    });

    router.delete("/:id", (req, res) => {
        const result = remove.run(readId(req.params.id));
        if (result.changes === 0) return res.status(404).json({ message: "Record not found." });
        return res.json({ message: "Record deleted." });
    });
    return router;
}

module.exports = { createRecordsRouter };
