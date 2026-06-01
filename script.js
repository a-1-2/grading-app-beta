const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = __dirname;

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".xml": "application/xml; charset=utf-8",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function send(res, statusCode, data, contentType = "text/plain; charset=utf-8") {
    res.writeHead(statusCode, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
    });
    res.end(data);
}

function resolveSafePath(urlPath) {
    const decoded = decodeURIComponent(urlPath.split("?")[0]);
    const normalized = decoded === "/" ? "/index.html" : decoded;
    const absolutePath = path.normalize(path.join(ROOT, normalized));
    if (!absolutePath.startsWith(ROOT)) return null;
    return absolutePath;
}

const server = http.createServer((req, res) => {
    const filePath = resolveSafePath(req.url || "/");
    if (!filePath) {
        send(res, 403, "Forbidden");
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            if (error.code === "ENOENT") {
                send(res, 404, "File not found");
            } else {
                send(res, 500, "Internal server error");
            }
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        send(res, 200, data, contentType);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Website đang chạy tại: http://${HOST}:${PORT}`);
    console.log("Nhấn Ctrl + C để dừng server.");
});
