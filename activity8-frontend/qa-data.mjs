import assert from "node:assert/strict";
import { test } from "node:test";
import { API_BASE_URL } from "./js/config.js";
import { recordService } from "./js/data.js";

const validRecord = {
    title: "New campus request",
    category: "Network",
    description: "A test support request.",
    status: "Pending"
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

function mockFetch(t, handler) {
    const original = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url, options = {}) => {
        requests.push({ url: String(url), options });
        return handler(String(url), options);
    };
    t.after(() => { globalThis.fetch = original; });
    return requests;
}

test("recordService maps all five methods to the API and sends only editable fields", async t => {
    const origin = API_BASE_URL;
    const record = { id: 17, ...validRecord };
    const requests = mockFetch(t, (url, options) => {
        if (url.endsWith("/api/records") && options.method === "POST") return jsonResponse(record, 201);
        if (url.endsWith("/api/records") && options.method === "GET") return jsonResponse([record]);
        if (url.endsWith("/api/records/17") && options.method === "GET") return jsonResponse(record);
        if (url.endsWith("/api/records/17") && options.method === "PUT") return jsonResponse(record);
        if (url.endsWith("/api/records/17") && options.method === "DELETE") return jsonResponse({ message: "Record deleted." });
        throw new Error("Unexpected API request: " + options.method + " " + url);
    });

    assert.deepEqual(await recordService.list(), [record]);
    assert.deepEqual(await recordService.get(17), record);
    assert.deepEqual(await recordService.create({ ...validRecord, title: "  New campus request  ", id: 99 }), record);
    assert.deepEqual(await recordService.update(17, validRecord), record);
    assert.deepEqual(await recordService.remove(17), { message: "Record deleted." });
    assert.equal(requests.length, 5);
    assert.deepEqual(requests.map(({ options }) => options.method || "GET"), ["GET", "GET", "POST", "PUT", "DELETE"]);
    assert.equal(requests[0].url, origin + "/api/records");
    assert.equal(requests[1].url, origin + "/api/records/17");
    for (const { options } of requests.filter(({ options }) => options.body)) {
        const sent = JSON.parse(options.body);
        assert.deepEqual(Object.keys(sent), ["title", "category", "description", "status"]);
        assert.equal(sent.title, "New campus request");
    }
});

test("recordService reports API messages and validates form data before sending", async t => {
    let calls = 0;
    mockFetch(t, () => { calls++; return jsonResponse({ message: "Title must contain 3 to 80 characters." }, 400); });
    await assert.rejects(recordService.create({ ...validRecord, title: "ab" }), { field: "title" });
    assert.equal(calls, 0);
    await assert.rejects(recordService.create(validRecord), /Title must contain 3 to 80 characters/);
    assert.equal(calls, 1);
});

test("recordService explains network and unreadable-response failures", async t => {
    const original = globalThis.fetch;
    t.after(() => { globalThis.fetch = original; });
    globalThis.fetch = async () => { throw new TypeError("network unavailable"); };
    await assert.rejects(recordService.list(), /Could not reach the support desk API/);
    globalThis.fetch = async () => new Response("not JSON", { status: 502 });
    await assert.rejects(recordService.list(), /unreadable response/);
});
