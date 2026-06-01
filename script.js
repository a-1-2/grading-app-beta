const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = __dirname;
const DEFAULT_DATA_DIR = path.join(os.homedir(), "Documents", "GradingAppData");
const DATA_DIR = process.env.GRADING_DATA_DIR || DEFAULT_DATA_DIR;
const DATA_FILE = path.join(DATA_DIR, "grading-data.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const DRAFT_FILE = path.join(DATA_DIR, "draft-data.json");
const TRASH_FILE = path.join(DATA_DIR, "trash.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const AUTO_BACKUP_DIR = path.join(BACKUP_DIR, "auto");
const DAILY_BACKUP_DIR = path.join(BACKUP_DIR, "daily");
const MONTHLY_BACKUP_DIR = path.join(BACKUP_DIR, "monthly");
const MANUAL_BACKUP_DIR = path.join(BACKUP_DIR, "manual");

const BACKUP_RULES = {
    autoLimit: 100,
    dailyLimit: 30,
    monthlyLimit: 12,
    manualLimit: 0,
};

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

function ensureDirectories() {
    [DATA_DIR, BACKUP_DIR, AUTO_BACKUP_DIR, DAILY_BACKUP_DIR, MONTHLY_BACKUP_DIR, MANUAL_BACKUP_DIR].forEach((dir) => {
        fs.mkdirSync(dir, { recursive: true });
    });

    if (!fs.existsSync(DATA_FILE)) writeJsonAtomic(DATA_FILE, { schools: [], records: {} });
    if (!fs.existsSync(SETTINGS_FILE)) writeJsonAtomic(SETTINGS_FILE, {});
    if (!fs.existsSync(TRASH_FILE)) writeJsonAtomic(TRASH_FILE, []);
}

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, "utf8");
        if (!raw.trim()) return fallback;
        return JSON.parse(raw);
    } catch (error) {
        console.error(`Cannot read JSON file: ${filePath}`, error.message);
        return fallback;
    }
}

function writeJsonAtomic(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
    fs.renameSync(tempPath, filePath);
}

function nowStamp() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}

function dateStamp() {
    return new Date().toISOString().slice(0, 10);
}

function monthStamp() {
    return new Date().toISOString().slice(0, 7);
}

function createSnapshot(reason = "backup") {
    return {
        createdAt: new Date().toISOString(),
        reason,
        data: readJson(DATA_FILE, { schools: [], records: {} }),
        settings: readJson(SETTINGS_FILE, {}),
    };
}

function fileExistsWithContent(filePath) {
    try {
        return fs.existsSync(filePath) && fs.statSync(filePath).size > 2;
    } catch {
        return false;
    }
}

function createBackup(type = "auto", reason = "auto backup") {
    ensureDirectories();
    if (!fileExistsWithContent(DATA_FILE)) return null;

    const targetDir =
        type === "daily" ? DAILY_BACKUP_DIR :
        type === "monthly" ? MONTHLY_BACKUP_DIR :
        type === "manual" ? MANUAL_BACKUP_DIR :
        AUTO_BACKUP_DIR;

    const name =
        type === "daily" ? `grading-data-${dateStamp()}.json` :
        type === "monthly" ? `grading-data-${monthStamp()}.json` :
        `grading-data-${nowStamp()}.json`;

    const targetPath = path.join(targetDir, name);
    if ((type === "daily" || type === "monthly") && fs.existsSync(targetPath)) return targetPath;

    writeJsonAtomic(targetPath, createSnapshot(reason));
    pruneBackups(targetDir, type);
    return targetPath;
}

function pruneBackups(dir, type) {
    const limit =
        type === "daily" ? BACKUP_RULES.dailyLimit :
        type === "monthly" ? BACKUP_RULES.monthlyLimit :
        type === "manual" ? BACKUP_RULES.manualLimit :
        BACKUP_RULES.autoLimit;

    if (!limit || limit < 1) return;

    const files = fs.readdirSync(dir)
        .filter((name) => name.endsWith(".json"))
        .map((name) => {
            const fullPath = path.join(dir, name);
            return { name, fullPath, mtime: fs.statSync(fullPath).mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);

    files.slice(limit).forEach((file) => {
        try { fs.unlinkSync(file.fullPath); } catch (error) { console.error(error.message); }
    });
}

function createScheduledBackups() {
    createBackup("daily", "daily backup");
    createBackup("monthly", "monthly backup");
}

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end(body);
}

function sendText(res, statusCode, data, contentType = "text/plain; charset=utf-8") {
    res.writeHead(statusCode, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
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

function readRequestBody(req, maxBytes = 50 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on("data", (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
                reject(new Error("Payload too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            if (!raw.trim()) return resolve({});
            try { resolve(JSON.parse(raw)); }
            catch { reject(new Error("Invalid JSON body")); }
        });
        req.on("error", reject);
    });
}

function listBackupsInDir(dir, type) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((name) => name.endsWith(".json"))
        .map((name) => {
            const fullPath = path.join(dir, name);
            const stat = fs.statSync(fullPath);
            const relPath = path.relative(BACKUP_DIR, fullPath).replace(/\\/g, "/");
            return {
                id: relPath,
                type,
                name,
                createdAt: stat.mtime.toISOString(),
                sizeBytes: stat.size,
            };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function listBackups() {
    return [
        ...listBackupsInDir(AUTO_BACKUP_DIR, "auto"),
        ...listBackupsInDir(DAILY_BACKUP_DIR, "daily"),
        ...listBackupsInDir(MONTHLY_BACKUP_DIR, "monthly"),
        ...listBackupsInDir(MANUAL_BACKUP_DIR, "manual"),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function resolveBackupId(id) {
    const normalized = String(id || "").replace(/\\/g, "/");
    if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) return null;
    const absolute = path.normalize(path.join(BACKUP_DIR, normalized));
    if (!absolute.startsWith(BACKUP_DIR)) return null;
    if (!fs.existsSync(absolute)) return null;
    return absolute;
}

async function handleApi(req, res, pathname) {
    try {
        if (req.method === "OPTIONS") {
            sendJson(res, 200, { ok: true });
            return true;
        }

        if (pathname === "/api/health" && req.method === "GET") {
            sendJson(res, 200, { ok: true, dataDir: DATA_DIR, backupRules: BACKUP_RULES });
            return true;
        }

        if (pathname === "/api/state" && req.method === "GET") {
            ensureDirectories();
            createScheduledBackups();
            sendJson(res, 200, {
                ok: true,
                data: readJson(DATA_FILE, { schools: [], records: {} }),
                settings: readJson(SETTINGS_FILE, {}),
                dataDir: DATA_DIR,
                storage: "local-json-server",
            });
            return true;
        }

        if (pathname === "/api/state" && req.method === "POST") {
            const body = await readRequestBody(req);
            createBackup("auto", body.reason || "before save");
            writeJsonAtomic(DATA_FILE, body.data || { schools: [], records: {} });
            writeJsonAtomic(SETTINGS_FILE, body.settings || {});
            createScheduledBackups();
            sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
            return true;
        }

        if (pathname === "/api/draft" && req.method === "GET") {
            sendJson(res, 200, { ok: true, draft: readJson(DRAFT_FILE, null) });
            return true;
        }

        if (pathname === "/api/draft" && req.method === "POST") {
            const body = await readRequestBody(req);
            writeJsonAtomic(DRAFT_FILE, { ...(body.draft || {}), savedAt: new Date().toISOString() });
            sendJson(res, 200, { ok: true });
            return true;
        }

        if (pathname === "/api/draft" && req.method === "DELETE") {
            if (fs.existsSync(DRAFT_FILE)) fs.unlinkSync(DRAFT_FILE);
            sendJson(res, 200, { ok: true });
            return true;
        }

        if (pathname === "/api/trash" && req.method === "GET") {
            sendJson(res, 200, { ok: true, items: readJson(TRASH_FILE, []) });
            return true;
        }

        if (pathname === "/api/trash/add" && req.method === "POST") {
            const body = await readRequestBody(req);
            const current = readJson(TRASH_FILE, []);
            const incoming = Array.isArray(body.items) ? body.items : [];
            const stamped = incoming.map((item) => ({
                trashId: item.trashId || `trash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                deletedAt: item.deletedAt || new Date().toISOString(),
                ...item,
            }));
            writeJsonAtomic(TRASH_FILE, [...stamped, ...current]);
            sendJson(res, 200, { ok: true, added: stamped.length });
            return true;
        }

        if (pathname === "/api/trash/mark-restored" && req.method === "POST") {
            const body = await readRequestBody(req);
            const ids = new Set(Array.isArray(body.trashIds) ? body.trashIds : []);
            const current = readJson(TRASH_FILE, []);
            writeJsonAtomic(TRASH_FILE, current.filter((item) => !ids.has(item.trashId)));
            sendJson(res, 200, { ok: true, removed: ids.size });
            return true;
        }

        if (pathname === "/api/backups" && req.method === "GET") {
            sendJson(res, 200, { ok: true, backups: listBackups(), rules: BACKUP_RULES });
            return true;
        }

        if (pathname === "/api/backups/manual" && req.method === "POST") {
            const body = await readRequestBody(req);
            const backupPath = createBackup("manual", body.reason || "manual backup");
            sendJson(res, 200, { ok: true, backup: backupPath ? path.basename(backupPath) : "" });
            return true;
        }

        if (pathname === "/api/backups/restore" && req.method === "POST") {
            const body = await readRequestBody(req);
            const backupPath = resolveBackupId(body.id);
            if (!backupPath) {
                sendJson(res, 404, { ok: false, error: "Không tìm thấy backup." });
                return true;
            }
            createBackup("manual", "before full restore");
            const snapshot = readJson(backupPath, null);
            if (!snapshot || !snapshot.data) {
                sendJson(res, 400, { ok: false, error: "Backup không hợp lệ." });
                return true;
            }
            writeJsonAtomic(DATA_FILE, snapshot.data || { schools: [], records: {} });
            writeJsonAtomic(SETTINGS_FILE, snapshot.settings || {});
            sendJson(res, 200, { ok: true, restoredAt: new Date().toISOString() });
            return true;
        }

        return false;
    } catch (error) {
        console.error(error);
        sendJson(res, 500, { ok: false, error: error.message || "Internal server error" });
        return true;
    }
}

ensureDirectories();

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    const pathname = url.pathname;

    if (pathname.startsWith("/api/")) {
        const handled = await handleApi(req, res, pathname);
        if (!handled) sendJson(res, 404, { ok: false, error: "API not found" });
        return;
    }

    const filePath = resolveSafePath(req.url || "/");
    if (!filePath) {
        sendText(res, 403, "Forbidden");
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            if (error.code === "ENOENT") {
                sendText(res, 404, "File not found");
            } else {
                sendText(res, 500, "Internal server error");
            }
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        sendText(res, 200, data, contentType);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Website đang chạy tại: http://${HOST}:${PORT}`);
    console.log(`Dữ liệu lưu tại: ${DATA_DIR}`);
    console.log("Nhấn Ctrl + C để dừng server.");
});
