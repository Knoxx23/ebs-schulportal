import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const LOG_PATH = process.env.LOG_PATH || '/app/data/logs/error.log';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure log directory exists
function ensureLogDirectory(): void {
  const logDir = path.dirname(LOG_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Rotate log file if it exceeds max size
function rotateLogIfNeeded(): void {
  try {
    if (fs.existsSync(LOG_PATH)) {
      const stats = fs.statSync(LOG_PATH);
      if (stats.size > MAX_LOG_SIZE) {
        const oldPath = `${LOG_PATH}.old`;
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
        fs.renameSync(LOG_PATH, oldPath);
      }
    }
  } catch (err) {
    console.error('[Logger] Failed to rotate log:', err);
  }
}

// Sanitize sensitive data from objects
function sanitizeForLog(obj: any, depth: number = 0): any {
  if (depth > 10) return '[Depth limit reached]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  const sensitiveKeys = /password|token|secret|api[_-]?key|auth|credential|ssn|credit|card|pin|cvv/i;
  const result: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeForLog(value, depth + 1);
    } else {
      result[key] = value;
    }
  }

  return result;
}

interface LogContext {
  [key: string]: any;
}

function writeLog(level: string, message: string, stack?: string, context?: LogContext): void {
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
    fs.appendFileSync(LOG_PATH, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.error('[Logger] Failed to write log:', err);
  }
}

export function logError(err: Error | string, context?: LogContext): void {
  const message = typeof err === 'string' ? err : (err.message || 'Unknown error');
  const stack = typeof err === 'object' && 'stack' in err ? err.stack : undefined;
  writeLog('ERROR', message, stack, context);
}

export function logWarn(msg: string, context?: LogContext): void {
  writeLog('WARN', msg, undefined, context);
}

export function logInfo(msg: string, context?: LogContext): void {
  writeLog('INFO', msg, undefined, context);
}

export default {
  logError,
  logWarn,
  logInfo,
};
