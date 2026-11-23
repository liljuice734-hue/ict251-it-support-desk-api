const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");
const { newDb } = require("pg-mem");
const { initialiseDatabase } = require("./db");
const { createApp } = require("./server");

const origin = "http://127.0.0.1:8000";
const validRecord = { title: "  Campus Wi-Fi testing  ", category: " Network ", description: "  A fictional connection problem.  ", status: " Pending " };

async function startServer(pool, context) {
    const server = createApp(pool, [origin]).listen(0, "127.0.0.1");
    await once(server, "listening");
    context.after(() => new Promise(resolve => server.close(resolve)));
    const url = "http://127.0.0.1:" + server.address().port;
    const request = async (path, options = {}) => {
        const headers = { ...options.headers };
        if (options.body !== undefined || options.rawBody !== undefined) headers["Content-Type"] = "application/json";
        const body = options.rawBody !== undefined ? options.rawBody
            : options.body === undefined ? undefined : JSON.stringify(options.body);
        const response = await fetch(url + path, { ...options, headers, body });
        const contentType = response.headers.get("content-type") || "";
        return { status: response.status, headers: response.headers, body: contentType.includes("application/json") ? await response.json() : await response.text() };
    };
    request.url = url;
    return request;
}

test("HTTP routes validate CRUD records and preserve PostgreSQL data", async context => {
    // pg-mem does not implement every PostgreSQL constraint in schema.sql;
    // disabling its strict AST check still executes the supported statements.
    const memory = newDb({ noAstCoverageCheck: true });
    const { Pool } = memory.adapters.createPg();
    const pool = new Pool();
    context.after(() => pool.end());
    await initialiseDatabase(pool);
    const request = await startServer(pool, context);
    const check = async (path, status, options) => {
        const response = await request(path, options);
        assert.equal(response.status, status, JSON.stringify(response.body));
        return response.body;
    };

    const guide = await check("/", 200);
    assert.match(guide, /IT Support Desk API.*202500305/s);
    assert.match(guide, /Live API base URL/);
    assert.ok(guide.includes(request.url), "guide must show the live base URL");
    assert.match(guide, /PUT \/api\/records\/:id/);
    assert.match(guide, /PostgreSQL/);
    assert.deepEqual(await check("/health", 200), { status: "ok", database: "connected" });
    assert.equal((await check("/api/records", 200)).length, 8);
    const created = await check("/api/records", 201, { method: "POST", body: validRecord });
    assert.deepEqual(created, { id: 9, title: "Campus Wi-Fi testing", category: "Network", description: "A fictional connection problem.", status: "Pending" });
    const path = "/api/records/" + created.id;
    assert.deepEqual(await check(path, 200), created);
    const ignoredId = await check("/api/records", 201, { method: "POST", body: { ...validRecord, id: 999999 } });
    assert.equal(ignoredId.id, created.id + 1, "client-supplied id must be ignored");
    assert.deepEqual(await check("/api/records/" + ignoredId.id, 200, { method: "DELETE" }), { message: "Record deleted." });
    const updated = await check(path, 200, { method: "PUT", body: { title: "Printer unavailable", category: "Hardware", description: "The fictional printer is offline.", status: "Completed" } });
    assert.equal(updated.id, created.id);
    assert.equal(updated.status, "Completed");
    for (const body of [{}, { ...validRecord, title: "  " }, { ...validRecord, title: "ab" }, { ...validRecord, title: "x".repeat(81) }, { ...validRecord, category: "x" }, { ...validRecord, category: "x".repeat(41) }, { ...validRecord, description: "1234" }, { ...validRecord, description: "x".repeat(301) }, { ...validRecord, status: "pending" }, { ...validRecord, title: 7 }]) {
        const response = await request("/api/records", { method: "POST", body });
        assert.equal(response.status, 400);
        assert.ok(response.body.message);
    }
    const malformed = await request("/api/records", { method: "POST", rawBody: "{not json" });
    assert.equal(malformed.status, 400);
    assert.ok(malformed.body.message);
    for (const id of ["0", "-1", "1.5", "abc"]) assert.equal((await request("/api/records/" + id)).status, 400);
    for (const method of ["GET", "PUT", "DELETE"]) {
        const options = method === "PUT" ? { method, body: validRecord } : { method };
        assert.equal((await request("/api/records/999", options)).status, 404, method + " on a missing record must return 404");
    }
    assert.equal((await request("/unknown")).status, 404);
    const preflight = await request(path, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "PUT" } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
    assert.deepEqual(await check(path, 200, { method: "DELETE" }), { message: "Record deleted." });
    await initialiseDatabase(pool);
    assert.equal((await check("/api/records", 200)).length, 8);
});
