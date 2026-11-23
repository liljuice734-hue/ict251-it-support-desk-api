import { API_BASE_URL } from "./config.js";

const allowedStatuses = ["Pending", "In progress", "Completed"];
const fields = [
    ["title", value => value.length >= 3 && value.length <= 80, "Title must contain 3 to 80 characters."],
    ["category", value => value.length >= 2 && value.length <= 40, "Select a category."],
    ["description", value => value.length >= 5 && value.length <= 300, "Description must contain 5 to 300 characters."],
    ["status", value => allowedStatuses.includes(value), "Select a valid status."]
];

function validateRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error("Enter a valid support request.");
    }

    const result = {};
    for (const [name, isValid, message] of fields) {
        const value = typeof record[name] === "string" ? record[name].trim() : "";
        if (!isValid(value)) throw Object.assign(new Error(message), { field: name });
        result[name] = value;
    }
    return result;
}

function validateId(id) {
    const value = Number(id);
    if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid record ID.");
    return value;
}

async function request(path, method = "GET", body) {
    const options = { method };
    if (body !== undefined) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(API_BASE_URL + path, options);
    } catch {
        throw new Error("Could not reach the support desk API. Check your connection and try again.");
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error("The support desk API returned an unreadable response. Please try again.");
    }

    if (!response.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "The request failed. Please try again.");
    }
    return data;
}

export const recordService = {
    async list() {
        const records = await request("/api/records");
        if (!Array.isArray(records)) throw new Error("The support desk API returned an invalid record list.");
        return records;
    },

    async get(id) {
        return request("/api/records/" + validateId(id));
    },

    async create(record) {
        return request("/api/records", "POST", validateRecord(record));
    },

    async update(id, record) {
        return request("/api/records/" + validateId(id), "PUT", validateRecord(record));
    },

    async remove(id) {
        return request("/api/records/" + validateId(id), "DELETE");
    }
};
