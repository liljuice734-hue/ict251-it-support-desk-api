const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { mkdtemp, realpath, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { dirname, join } = require("node:path");
const { test } = require("node:test");

const origin = "http://127.0.0.1:8000";
const input = {
    title: "  Campus Wi-Fi testing  ",
    category: " Network ",
    description: "  A fictional connection problem.  ",
    status: " Pending ",
    id: 999
};

async function startServer(databasePath, context) {
    const child = spawn(process.execPath, ["server.js"], {
        cwd: __dirname,
        env: { ...process.env, PORT: "0", DATABASE_PATH: databasePath, CLIENT_ORIGINS: origin },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
    });
    const exited = once(child, "exit");
    async function stop() {
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await exited;
    }
    context.after(stop);

    let output = "";
    let errors = "";
    child.stderr.on("data", chunk => { errors += chunk; });
    const port = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("API startup timed out. " + errors)), 5000);
        child.once("error", error => { clearTimeout(timer); reject(error); });
        child.once("exit", () => { clearTimeout(timer); reject(new Error(errors || "API stopped before startup.")); });
        child.stdout.on("data", chunk => {
            output += chunk;
            const match = output.match(/listening on port (\d+)/);
            if (match) {
                clearTimeout(timer);
                resolve(match[1]);
            }
        });
    });

    async function request(path, { method = "GET", body, raw, headers = {} } = {}) {
        if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";
        const response = await fetch("http://127.0.0.1:" + port + path, {
            method, body: raw ?? JSON.stringify(body), headers, signal: AbortSignal.timeout(5000)
        });
        const result = response.headers.get("content-type")?.includes("application/json")
            ? await response.json()
            : await response.text();
        return { status: response.status, result, headers: response.headers };
    }

    return { request, stop };
}

test("HTTP routes, validation, CORS, and SQLite persistence across process restarts", { timeout: 30000 }, async context => {
    const root = await realpath(tmpdir());
    const directory = await mkdtemp(join(root, "ict251-api-test-"));
    try {
        const databasePath = join(directory, "test.sqlite");
        let api = await startServer(databasePath, context);
        const records = "/api/records";
        const check = async (path, status, options) => {
            const response = await api.request(path, options);
            assert.equal(response.status, status, JSON.stringify(response.result));
            if (status >= 400) assert.ok(response.result.message);
            return response.result;
        };

        assert.match(await check("/", 200), /IT Support Desk API.*202500305/s);
        assert.deepEqual(await check("/health", 200), { status: "ok", database: "connected" });
        const seeds = await check(records, 200);
        assert.equal(seeds.length, 8);
        assert.equal(new Set(seeds.map(record => record.id)).size, 8);

        const created = await check(records, 201, { method: "POST", body: input });
        assert.deepEqual(created, {
            id: 9, title: "Campus Wi-Fi testing", category: "Network",
            description: "A fictional connection problem.", status: "Pending"
        });
        const item = records + "/" + created.id;
        assert.deepEqual(await check(item, 200), created);
        const updated = await check(item, 200, { method: "PUT", body: {
            title: "Printer unavailable", category: "Hardware",
            description: "The fictional printer is offline.", status: "Completed", id: 123
        } });
        assert.equal(updated.id, created.id);
        assert.equal(updated.status, "Completed");

        for (const body of [
            {}, { ...input, title: "  " }, { ...input, title: "ab" }, { ...input, title: "x".repeat(81) },
            { ...input, category: "x" }, { ...input, category: "x".repeat(41) },
            { ...input, description: "1234" }, { ...input, description: "x".repeat(301) },
            { ...input, status: "pending" }, { ...input, title: 7 }
        ]) {
            await check(records, 400, { method: "POST", body });
        }
        await check(item, 400, { method: "PUT", body: { ...input, status: "unknown" } });
        await check(records, 400, { method: "POST", raw: '{"title":' });
        assert.equal((await check(records, 200)).length, 9);

        for (const method of ["GET", "PUT", "DELETE"]) {
            const options = method === "PUT" ? { method, body: input } : { method };
            for (const id of ["0", "-1", "1.5", "abc", "9007199254740992"]) {
                await check(records + "/" + id, 400, options);
            }
            await check(records + "/999", 404, options);
        }
        await check("/unknown", 404);

        const preflight = await api.request(item, {
            method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "PUT" }
        });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
        const otherOrigin = await api.request(records, { headers: { Origin: "https://example.invalid" } });
        assert.equal(otherOrigin.headers.get("access-control-allow-origin"), null);

        await api.stop();
        api = await startServer(databasePath, context);
        assert.deepEqual(await check(item, 200), updated);
        assert.deepEqual(await check(item, 200, { method: "DELETE" }), { message: "Record deleted." });
        await check(item, 404);
        for (const { id } of seeds) {
            await check(records + "/" + id, 200, { method: "DELETE" });
        }
        await api.stop();

        api = await startServer(databasePath, context);
        assert.deepEqual(await check(records, 200), []);
        const next = await check(records, 201, { method: "POST", body: input });
        assert.ok(next.id > created.id);
        await api.stop();
    } finally {
        const resolved = await realpath(directory);
        if (dirname(resolved) !== root) throw new Error("Unexpected test database location.");
        // Registered hooks stop any child still running before removing the test database.
        context.after(() => rm(resolved, { recursive: true, force: true, maxRetries: 5 }));
    }
});
