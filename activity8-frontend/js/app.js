import { recordService } from "./data.js";
import { API_BASE_URL } from "./config.js";

const $ = id => document.getElementById(id);
const form = $("request-form");
const fields = [...form.elements].filter(element => element.name);
const save = $("save-btn");
const cancel = $("cancel-edit-btn");
const search = $("search");
const filter = $("filter-status");
const body = $("records-body");
const count = $("record-count");
const message = $("message");
const details = $("record-details");
const detailsContent = $("details-content");
const close = $("close-details-btn");
const metrics = new Map([
    ["Pending", $("pending-count")],
    ["In progress", $("progress-count")],
    ["Completed", $("completed-count")]
]);

let editingId = null;
let viewingId = null;
let editTrigger = null;
let detailsTrigger = null;
let busy = false;
let renderVersion = 0;

function notify(text, type = "success") {
    message.className = type;
    message.textContent = text;
}

function renderNotice(text) {
    const row = body.insertRow();
    row.setAttribute("role", "row");
    const cell = row.insertCell();
    cell.setAttribute("role", "cell");
    cell.colSpan = 5;
    cell.className = "empty";
    cell.textContent = text;
}

function renderRow(record) {
    const row = body.insertRow();
    row.setAttribute("role", "row");
    for (const key of ["id", "title", "category", "status"]) {
        const cell = row.insertCell();
        cell.setAttribute("role", "cell");
        if (key === "status") {
            const badge = document.createElement("span");
            badge.className = "badge badge-" + record.status.toLowerCase().replaceAll(" ", "-");
            badge.textContent = record.status;
            cell.append(badge);
        } else {
            cell.textContent = key === "id" ? "#" + record.id : record[key];
        }
    }

    const actions = row.insertCell();
    actions.setAttribute("role", "cell");
    const group = document.createElement("div");
    group.className = "row-actions";
    for (const label of ["View", "Edit", "Delete"]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.dataset.action = label.toLowerCase();
        button.dataset.id = record.id;
        button.setAttribute("aria-label", label + " request #" + record.id + " " + record.title);
        group.append(button);
    }
    actions.append(group);
}

async function refreshRecords() {
    const version = ++renderVersion;
    try {
        const records = await recordService.list();
        if (version !== renderVersion) return;
        const query = search.value.trim().toLowerCase();
        const status = filter.value;
        const matching = records.filter(record =>
            record.title.toLowerCase().includes(query) && (status === "All" || record.status === status)
        );

        $("total-count").textContent = records.length;
        for (const [name, element] of metrics) {
            element.textContent = records.filter(record => record.status === name).length;
        }

        const focused = body.contains(document.activeElement) ? document.activeElement.dataset : null;
        body.replaceChildren();
        for (const record of matching) renderRow(record);
        if (matching.length === 0) {
            renderNotice(records.length ? "No requests match your search and filters." : "No requests yet. Use the form to add one.");
        }
        count.textContent = `Showing ${matching.length} of ${records.length} requests`;
        if (focused) restoreAction(focused);
        if (viewingId !== null) {
            const record = records.find(item => item.id === viewingId);
            if (record) populateDetails(record);
            else hideDetails(details.contains(document.activeElement));
        }
    } catch (error) {
        if (version !== renderVersion) return;
        body.replaceChildren();
        renderNotice("Request records are unavailable.");
        count.textContent = "Unable to load records";
        for (const element of [$("total-count"), ...metrics.values()]) element.textContent = "—";
        notify(error.message, "error");
    }
}

function restoreAction(trigger) {
    const button = trigger && body.querySelector(`[data-action="${trigger.action}"][data-id="${trigger.id}"]`);
    (button || search).focus();
}

function populateDetails(record) {
    viewingId = record.id;
    detailsContent.replaceChildren();
    for (const [label, key] of [["ID", "id"], ["Title", "title"], ["Category", "category"], ["Description", "description"], ["Status", "status"]]) {
        const term = document.createElement("dt");
        const definition = document.createElement("dd");
        term.textContent = label;
        definition.textContent = record[key];
        detailsContent.append(term, definition);
    }
    details.hidden = false;
}

function hideDetails(returnFocus = false) {
    details.hidden = true;
    detailsContent.replaceChildren();
    viewingId = null;
    if (returnFocus) restoreAction(detailsTrigger);
    detailsTrigger = null;
}

form.addEventListener("reset", () => {
    const focusWouldDisappear = document.activeElement === cancel;
    editingId = null;
    editTrigger = null;
    $("form-heading").textContent = "New request";
    save.textContent = "Save request";
    cancel.hidden = true;
    for (const field of fields) field.removeAttribute("aria-invalid");
    if (focusWouldDisappear) $("title").focus();
});

for (const field of fields) {
    field.addEventListener("input", () => field.removeAttribute("aria-invalid"));
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const returnToSave = document.activeElement === save;
    save.disabled = true;
    try {
        const data = Object.fromEntries(fields.map(field => [field.name, field.value]));
        const isEditing = editingId !== null;
        if (isEditing) await recordService.update(editingId, data);
        else await recordService.create(data);
        form.reset();
        hideDetails();
        notify(isEditing ? "Request updated." : "Request saved.");
        await refreshRecords();
    } catch (error) {
        notify(error.message, "error");
        const field = fields.find(input => input.name === error.field);
        if (field) {
            field.setAttribute("aria-invalid", "true");
            field.focus();
        }
    } finally {
        busy = false;
        save.disabled = false;
        if (returnToSave && document.activeElement === document.body) save.focus();
    }
});

cancel.addEventListener("click", () => {
    const trigger = editTrigger;
    form.reset();
    notify("Editing cancelled.");
    restoreAction(trigger);
});

body.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button || busy) return;
    const trigger = { ...button.dataset };
    busy = true;
    save.disabled = true;
    try {
        const record = await recordService.get(trigger.id);
        if (trigger.action === "view") {
            detailsTrigger = trigger;
            populateDetails(record);
            close.focus();
        } else if (trigger.action === "edit") {
            editingId = record.id;
            editTrigger = trigger;
            for (const field of fields) {
                field.value = record[field.name];
                field.removeAttribute("aria-invalid");
            }
            $("form-heading").textContent = "Edit request #" + record.id;
            save.textContent = "Update request";
            cancel.hidden = false;
            hideDetails();
            $("title").focus();
        } else if (window.confirm(`Delete request #${record.id} “${record.title}”?`)) {
            await recordService.remove(record.id);
            if (editingId === record.id) form.reset();
            if (viewingId === record.id) hideDetails(details.contains(document.activeElement));
            notify("Request deleted.");
            await refreshRecords();
            if (document.activeElement === document.body) search.focus();
        }
    } catch (error) {
        notify(error.message, "error");
    } finally {
        busy = false;
        save.disabled = false;
    }
});

close.addEventListener("click", () => hideDetails(true));
search.addEventListener("input", refreshRecords);
filter.addEventListener("change", refreshRecords);
const links = document.querySelectorAll("nav a");
$("backend-guide-link").href = API_BASE_URL + "/";
$("backend-health-link").href = API_BASE_URL + "/health";

function markNavigation() {
    const destination = location.hash === "#title" ? "#manage-records" : location.hash || "#home";
    for (const link of links) {
        if (link.hash === destination) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
    }
}

window.addEventListener("hashchange", markNavigation);
markNavigation();
refreshRecords();
