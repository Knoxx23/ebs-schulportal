"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initDatabase = initDatabase;
const sql_js_1 = __importDefault(require("sql.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const loggerService_1 = require("./services/loggerService");
dotenv_1.default.config();
const DB_PATH = process.env.DB_PATH || './ebs.db';
const dbPath = path_1.default.resolve(DB_PATH);
// Ensure directory exists
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
// Wrapper to provide better-sqlite3-compatible API over sql.js
class PreparedStatementWrapper {
    constructor(sqlDb, sql, saveFn) {
        this.sqlDb = sqlDb;
        this.sql = sql;
        this.saveFn = saveFn;
    }
    get(...params) {
        const stmt = this.sqlDb.prepare(this.sql);
        try {
            if (params.length > 0) {
                stmt.bind(params);
            }
            if (stmt.step()) {
                return stmt.getAsObject();
            }
            return undefined;
        }
        finally {
            stmt.free();
        }
    }
    all(...params) {
        const stmt = this.sqlDb.prepare(this.sql);
        try {
            if (params.length > 0) {
                stmt.bind(params);
            }
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            return results;
        }
        finally {
            stmt.free();
        }
    }
    run(...params) {
        if (params.length > 0) {
            this.sqlDb.run(this.sql, params);
        }
        else {
            this.sqlDb.run(this.sql);
        }
        const changes = this.sqlDb.getRowsModified();
        const result = this.sqlDb.exec("SELECT last_insert_rowid() as id");
        const lastInsertRowid = result.length > 0 ? result[0].values[0][0] : 0;
        this.saveFn();
        return { changes, lastInsertRowid };
    }
}
class DatabaseWrapper {
    constructor(sqlDb, dbPath) {
        this.saveTimer = null;
        this.sqlDb = sqlDb;
        this.dbPath = dbPath;
    }
    prepare(sql) {
        return new PreparedStatementWrapper(this.sqlDb, sql, () => this.scheduleSave());
    }
    exec(sql) {
        this.sqlDb.exec(sql);
        this.saveNow();
    }
    pragma(pragma) {
        try {
            this.sqlDb.exec(`PRAGMA ${pragma}`);
        }
        catch {
            // Some pragmas may not be supported in sql.js
        }
    }
    // Debounced save - batches rapid writes
    scheduleSave() {
        if (this.saveTimer)
            return;
        this.saveTimer = setTimeout(() => {
            this.saveNow();
            this.saveTimer = null;
        }, 100);
    }
    saveNow() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        try {
            const data = this.sqlDb.export();
            const buffer = Buffer.from(data);
            fs_1.default.writeFileSync(this.dbPath, buffer);
        }
        catch (err) {
            console.error('Failed to save database:', err);
            (0, loggerService_1.logError)(err, { dbPath: this.dbPath, operation: 'saveNow' });
        }
    }
    close() {
        this.saveNow();
        this.sqlDb.close();
    }
}
// The actual database instance - set during initDatabase()
let dbInstance = null;
// Proxy that forwards all calls to the actual instance
const db = new Proxy({}, {
    get(_target, prop) {
        if (!dbInstance) {
            throw new Error('Database not initialized. Call initDatabase() first.');
        }
        const value = dbInstance[prop];
        if (typeof value === 'function') {
            return value.bind(dbInstance);
        }
        return value;
    },
});
exports.db = db;
async function initDatabase() {
    const SQL = await (0, sql_js_1.default)();
    let sqlDb;
    if (fs_1.default.existsSync(dbPath)) {
        const fileBuffer = fs_1.default.readFileSync(dbPath);
        sqlDb = new SQL.Database(fileBuffer);
    }
    else {
        sqlDb = new SQL.Database();
    }
    dbInstance = new DatabaseWrapper(sqlDb, dbPath);
    // Enable foreign keys
    dbInstance.pragma('foreign_keys = ON');
    // Create tables
    dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('teacher','secretary','principal','admin')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      code TEXT NOT NULL,
      child_last_name TEXT,
      child_first_name TEXT,
      class_ref TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','activated','completed','expired')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      activated_at TEXT,
      session_id TEXT
    );

    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitation_id INTEGER UNIQUE REFERENCES invitations(id),
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','returned','approved','archived')),
      last_name TEXT,
      first_name TEXT,
      birth_date TEXT,
      birth_place TEXT,
      gender TEXT,
      nationality TEXT,
      guardian_name TEXT,
      guardian_street TEXT,
      guardian_zip TEXT,
      guardian_city TEXT,
      phone TEXT,
      email TEXT,
      kindergarten TEXT,
      enrollment_year TEXT,
      enrollment_date TEXT,
      future_path TEXT CHECK(future_path IN ('A','B','C','D') OR future_path IS NULL),
      future_school TEXT,
      future_notes TEXT,
      language TEXT DEFAULT 'de',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      submitted_at TEXT,
      approved_at TEXT,
      approved_by INTEGER REFERENCES users(id),
      return_note TEXT,
      document_path TEXT,
      document_hash TEXT,
      retention_delete_at TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL CHECK(actor_type IN ('parent','staff','system')),
      actor_id TEXT,
      case_id INTEGER REFERENCES cases(id),
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER REFERENCES cases(id),
      type TEXT NOT NULL CHECK(type IN ('email','sms')),
      trigger_type TEXT NOT NULL,
      sent_at TEXT,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS parent_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      invitation_id INTEGER REFERENCES invitations(id),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consent_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER REFERENCES cases(id),
      consent_type TEXT NOT NULL,
      given_at TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
    // Create indexes
    dbInstance.exec(`
    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
    CREATE INDEX IF NOT EXISTS idx_cases_invitation_id ON cases(invitation_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
    CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
    CREATE INDEX IF NOT EXISTS idx_parent_sessions_session_id ON parent_sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_case_id ON audit_log(case_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
    CREATE INDEX IF NOT EXISTS idx_consent_log_case_id ON consent_log(case_id);
    CREATE INDEX IF NOT EXISTS idx_consent_log_created_at ON consent_log(created_at);
  `);
    // Create default admin user if none exists
    const adminExists = dbInstance.prepare('SELECT id FROM users WHERE role = ?').get('admin');
    if (!adminExists) {
        const bcrypt = require('bcryptjs');
        // Use INITIAL_ADMIN_PASSWORD env var if set, otherwise generate random password
        let adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
        if (!adminPassword) {
            adminPassword = crypto_1.default.randomBytes(16).toString('hex');
        }
        const hash = bcrypt.hashSync(adminPassword, 12);
        dbInstance.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin@schule.de', hash, 'Administrator', 'admin');
        console.log('\n!!! ADMIN PASSWORD GENERATED - CHANGE IMMEDIATELY !!!');
        console.log(`Admin Email: admin@schule.de`);
        console.log(`Admin Password: ${adminPassword}`);
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
    }
    console.log('Database initialized successfully');
}
// Graceful shutdown
process.on('SIGINT', () => {
    if (dbInstance)
        dbInstance.close();
    process.exit(0);
});
process.on('SIGTERM', () => {
    if (dbInstance)
        dbInstance.close();
    process.exit(0);
});
exports.default = db;
//# sourceMappingURL=database.js.map