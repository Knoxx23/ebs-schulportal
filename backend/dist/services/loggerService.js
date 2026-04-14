"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = logError;
exports.logWarn = logWarn;
exports.logInfo = logInfo;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const LOG_PATH = process.env.LOG_PATH || '/app/data/logs/error.log';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
// Ensure log directory exists
function ensureLogDirectory() {
    const logDir = path_1.default.dirname(LOG_PATH);
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
}
// Rotate log file if it exceeds max size
function rotateLogIfNeeded() {
    try {
        if (fs_1.default.existsSync(LOG_PATH)) {
            const stats = fs_1.default.statSync(LOG_PATH);
            if (stats.size > MAX_LOG_SIZE) {
                const oldPath = `${LOG_PATH}.old`;
                if (fs_1.default.existsSync(oldPath)) {
                    fs_1.default.unlinkSync(oldPath);
                }
                fs_1.default.renameSync(LOG_PATH, oldPath);
            }
        }
    }
    catch (err) {
        console.error('[Logger] Failed to rotate log:', err);
    }
}
// Sanitize sensitive data from objects
function sanitizeForLog(obj, depth = 0) {
    if (depth > 10)
        return '[Depth limit reached]';
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj !== 'object')
        return obj;
    const sensitiveKeys = /password|token|secret|api[_-]?key|auth|credential|ssn|credit|card|pin|cvv/i;
    const result = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.test(key)) {
            result[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeForLog(value, depth + 1);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function writeLog(level, message, stack, context) {
    ensureLogDirectory();
    rotateLogIfNeeded();
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? sanitizeForLog(context) : {};
    const logEntry = {
        timestamp,
        level,
        message,
        ...(stack && { stack }),
        ...(Object.keys(sanitizedContext).length > 0 && { context: sanitizedContext }),
    };
    try {
        fs_1.default.appendFileSync(LOG_PATH, JSON.stringify(logEntry) + '\n');
    }
    catch (err) {
        console.error('[Logger] Failed to write log:', err);
    }
}
function logError(err, context) {
    const message = typeof err === 'string' ? err : (err.message || 'Unknown error');
    const stack = typeof err === 'object' && 'stack' in err ? err.stack : undefined;
    writeLog('ERROR', message, stack, context);
}
function logWarn(msg, context) {
    writeLog('WARN', msg, undefined, context);
}
function logInfo(msg, context) {
    writeLog('INFO', msg, undefined, context);
}
exports.default = {
    logError,
    logWarn,
    logInfo,
};
//# sourceMappingURL=loggerService.js.map