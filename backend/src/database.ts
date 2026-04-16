import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { logError } from './services/loggerService';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './ebs.db';
const dbPath = path.resolve(DB_PATH);

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Wrapper to provide better-sqlite3-compatible API over sql.js
class PreparedStatementWrapper {
  private sqlDb: SqlJsDatabase;
  private sql: string;
  private saveFn: () => void;

  constructor(sqlDb: SqlJsDatabase, sql: string, saveFn: () => void) {
    this.sqlDb = sqlDb;
    this.sql = sql;
    this.saveFn = saveFn;
  }

  get(...params: any[]): any {
    const stmt = this.sqlDb.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params: any[]): any[] {
    const stmt = this.sqlDb.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      const results: any[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    if (params.length > 0) {
      this.sqlDb.run(this.sql, params);
    } else {
      this.sqlDb.run(this.sql);
    }
    const changes = this.sqlDb.getRowsModified();
    const result = this.sqlDb.exec("SELECT last_insert_rowid() as id");
    const lastInsertRowid = result.length > 0 ? (result[0].values[0][0] as number) : 0;
    this.saveFn();
    return { changes, lastInsertRowid };
  }
}

class DatabaseWrapper {
  private sqlDb: SqlJsDatabase;
  private dbPath: string;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(sqlDb: SqlJsDatabase, dbPath: string) {
    this.sqlDb = sqlDb;
    this.dbPath = dbPath;
  }

  prepare(sql: string): PreparedStatementWrapper {
    return new PreparedStatementWrapper(this.sqlDb, sql, () => this.scheduleSave());
  }

  exec(sql: string): void {
    this.sqlDb.exec(sql);
    this.saveNow();
  }

  pragma(pragma: string): void {
    try {
      this.sqlDb.exec(`PRAGMA ${pragma}`);
    } catch {
      // Some pragmas may not be supported in sql.js
    }
  }

  // Debounced save - batches rapid writes
  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveNow();
      this.saveTimer = null;
    }, 100);
  }

  saveNow(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      const data = this.sqlDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('Failed to save database:', err);
      logError(err as Error, { dbPath: this.dbPath, operation: 'saveNow' });
    }
  }

  close(): void {
    this.saveNow();
    this.sqlDb.close();
  }
}

// The actual database instance - set during initDatabase()
let dbInstance: DatabaseWrapper | null = null;

// Proxy that forwards all calls to the actual instance
const db = new Proxy({} as DatabaseWrapper, {
  get(_target, prop: string) {
    if (!dbInstance) {
      throw new Error('Database not initialized. Call initDatabase() first.');
    }
    const value = (dbInstance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(dbInstance);
    }
    return value;
  },
});

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
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

  // Migration: Add new fields from EBS_blanko.doc (run safely with IF NOT EXISTS pattern)
  const newColumns = [
    // Step 1 - Personal data
    { col: 'birth_country',        def: 'TEXT' },
    { col: 'immigration_year',     def: 'TEXT' },
    { col: 'confession',           def: 'TEXT' },
    { col: 'mother_tongue',        def: 'TEXT' },
    { col: 'aussiedler',           def: 'TEXT' },
    // Step 2 - Family
    { col: 'emergency_phone',      def: 'TEXT' },
    { col: 'guardian_1_last_name', def: 'TEXT' },
    { col: 'guardian_1_first_name',def: 'TEXT' },
    { col: 'guardian_1_birth_country', def: 'TEXT' },
    { col: 'guardian_2_last_name', def: 'TEXT' },
    { col: 'guardian_2_first_name',def: 'TEXT' },
    { col: 'guardian_2_birth_country', def: 'TEXT' },
    // Step 2 - Guardian addresses (separate for each parent)
    { col: 'guardian_1_street',      def: 'TEXT' },
    { col: 'guardian_1_zip',         def: 'TEXT' },
    { col: 'guardian_1_city',        def: 'TEXT' },
    { col: 'guardian_1_phone',       def: 'TEXT' },
    { col: 'guardian_2_street',      def: 'TEXT' },
    { col: 'guardian_2_zip',         def: 'TEXT' },
    { col: 'guardian_2_city',        def: 'TEXT' },
    { col: 'guardian_2_phone',       def: 'TEXT' },
    // Step 3 - School history (enrollment/transition years)
    { col: 'enrollment_year',        def: 'TEXT' },
    { col: 'transition_year',        def: 'TEXT' },
    { col: 'last_school_type',     def: 'TEXT' },
    { col: 'last_school_name',     def: 'TEXT' },
    { col: 'graduation_expected',  def: 'TEXT' },
    { col: 'graduation_class',     def: 'TEXT' },
    // Step 4 - Future path details
    { col: 'future_company_name',  def: 'TEXT' },
    { col: 'future_company_phone', def: 'TEXT' },
    { col: 'future_company_address', def: 'TEXT' },
    { col: 'future_job_title',     def: 'TEXT' },
    { col: 'future_duration_from', def: 'TEXT' },
    { col: 'future_duration_to',   def: 'TEXT' },
    { col: 'future_school_address',def: 'TEXT' },
    { col: 'future_school_class',  def: 'TEXT' },
    { col: 'future_berufsfeld',    def: 'TEXT' },
    { col: 'future_measure_name',  def: 'TEXT' },
    { col: 'future_measure_org',   def: 'TEXT' },
    { col: 'future_measure_from',  def: 'TEXT' },
    { col: 'future_measure_to',    def: 'TEXT' },
  ];
  const existingCols = dbInstance.prepare("PRAGMA table_info(cases)").all().map((r: any) => r.name);
  for (const { col, def } of newColumns) {
    if (!existingCols.includes(col)) {
      dbInstance.exec(`ALTER TABLE cases ADD COLUMN ${col} ${def}`);
    }
  }

  // Create default admin user if none exists
  const adminExists = dbInstance.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const bcrypt = require('bcryptjs');

    // Use INITIAL_ADMIN_PASSWORD env var if set, otherwise generate random password
    let adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!adminPassword) {
      adminPassword = crypto.randomBytes(16).toString('hex');
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
  if (dbInstance) dbInstance.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (dbInstance) dbInstance.close();
  process.exit(0);
});

export { db };
export default db;
