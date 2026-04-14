import { Database as SqlJsDatabase } from 'sql.js';
declare class PreparedStatementWrapper {
    private sqlDb;
    private sql;
    private saveFn;
    constructor(sqlDb: SqlJsDatabase, sql: string, saveFn: () => void);
    get(...params: any[]): any;
    all(...params: any[]): any[];
    run(...params: any[]): {
        changes: number;
        lastInsertRowid: number;
    };
}
declare class DatabaseWrapper {
    private sqlDb;
    private dbPath;
    private saveTimer;
    constructor(sqlDb: SqlJsDatabase, dbPath: string);
    prepare(sql: string): PreparedStatementWrapper;
    exec(sql: string): void;
    pragma(pragma: string): void;
    private scheduleSave;
    saveNow(): void;
    close(): void;
}
declare const db: DatabaseWrapper;
export declare function initDatabase(): Promise<void>;
export { db };
export default db;
//# sourceMappingURL=database.d.ts.map