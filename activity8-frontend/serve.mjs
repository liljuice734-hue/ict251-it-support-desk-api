import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const files = new Map([
    ["/", ["index.html", "text/html"]],
    ["/index.html", ["index.html", "text/html"]],
    ["/css/styles.css", ["css/styles.css", "text/css"]],
    ["/js/app.js", ["js/app.js", "text/javascript"]],
    ["/js/data.js", ["js/data.js", "text/javascript"]],
    ["/js/config.js", ["js/config.js", "text/javascript"]]
]);

export function createPreviewServer() {
    return createServer(async (request, response) => {
        const asset = files.get(request.url.split("?")[0]);
        if (!asset) {
            response.writeHead(404).end();
            return;
        }

        try {
            const content = await readFile(new URL(asset[0], import.meta.url));
            response.writeHead(200, { "Content-Type": asset[1] + "; charset=utf-8" }).end(content);
        } catch {
            response.writeHead(500).end("Unable to read file.");
        }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const port = Number(process.argv[2] ?? 8000);
    createPreviewServer().listen(port, "127.0.0.1", () => {
        console.log(`IT Support Desk running at http://127.0.0.1:${port}/`);
    });
}
