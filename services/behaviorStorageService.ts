// BehaviorStorageService - SQLite-based storage for VRM behavior configs
// Replaces localStorage with persistent server-side database

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface TrainingDataExport {
  exportedAt: string;
  sessions: Array<{
    sessionId: string;
    startedAt: string;
    endedAt: string | null;
    changes: Array<{
      timestamp: string;
      modelName: string;
      behaviorType: string;
      context: string;
      oldValue: object;
      newValue: object;
    }>;
  }>;
}

export interface DatabaseStats {
  totalConfigs: number;
  totalSessions: number;
  totalChanges: number;
  configsByModel: Record<string, number>;
  dbSizeBytes: number;
}

export class BehaviorStorageService {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Default to data/behaviors.db in project root
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'behaviors.db');
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.db = new Database(this.dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      -- Model behavior configurations (overrides only)
      CREATE TABLE IF NOT EXISTS behavior_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_name TEXT NOT NULL,
        behavior_type TEXT NOT NULL,
        config_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(model_name, behavior_type)
      );

      -- User sessions for AI training
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        metadata_json TEXT
      );

      -- Behavior change log for AI training
      CREATE TABLE IF NOT EXISTS behavior_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        behavior_type TEXT NOT NULL,
        change_context TEXT,
        old_value_json TEXT,
        new_value_json TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );

      CREATE INDEX IF NOT EXISTS idx_configs_model ON behavior_configs(model_name);
      CREATE INDEX IF NOT EXISTS idx_changes_session ON behavior_changes(session_id);
      CREATE INDEX IF NOT EXISTS idx_changes_timestamp ON behavior_changes(timestamp);
    `);
  }


  // ============ Config CRUD Operations ============

  /**
   * Save a behavior config (upsert - insert or update)
   */
  saveConfig(modelName: string, behaviorType: string, config: object): void {
    const stmt = this.db.prepare(`
      INSERT INTO behavior_configs (model_name, behavior_type, config_json, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(model_name, behavior_type) 
      DO UPDATE SET config_json = excluded.config_json, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(modelName, behaviorType, JSON.stringify(config));
  }

  /**
   * Get a specific behavior config
   */
  getConfig(modelName: string, behaviorType: string): object | null {
    const stmt = this.db.prepare(`
      SELECT config_json FROM behavior_configs 
      WHERE model_name = ? AND behavior_type = ?
    `);
    const row = stmt.get(modelName, behaviorType) as { config_json: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.config_json);
    } catch {
      return null;
    }
  }

  /**
   * Get all behavior configs for a model
   */
  getAllConfigs(modelName: string): Record<string, object> {
    const stmt = this.db.prepare(`
      SELECT behavior_type, config_json FROM behavior_configs 
      WHERE model_name = ?
    `);
    const rows = stmt.all(modelName) as Array<{ behavior_type: string; config_json: string }>;
    
    const result: Record<string, object> = {};
    for (const row of rows) {
      try {
        result[row.behavior_type] = JSON.parse(row.config_json);
      } catch {
        // Skip invalid JSON
      }
    }
    return result;
  }

  /**
   * Delete behavior config(s) for a model
   */
  deleteConfig(modelName: string, behaviorType?: string): void {
    if (behaviorType) {
      const stmt = this.db.prepare(`
        DELETE FROM behavior_configs WHERE model_name = ? AND behavior_type = ?
      `);
      stmt.run(modelName, behaviorType);
    } else {
      const stmt = this.db.prepare(`
        DELETE FROM behavior_configs WHERE model_name = ?
      `);
      stmt.run(modelName);
    }
  }

  // ============ Session Tracking ============

  /**
   * Start a new session, returns session ID
   */
  startSession(metadata?: object): string {
    const sessionId = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO sessions (session_id, metadata_json) VALUES (?, ?)
    `);
    stmt.run(sessionId, metadata ? JSON.stringify(metadata) : null);
    return sessionId;
  }

  /**
   * End a session
   */
  endSession(sessionId: string): void {
    const stmt = this.db.prepare(`
      UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE session_id = ?
    `);
    stmt.run(sessionId);
  }

  /**
   * Log a behavior change during a session
   */
  logChange(
    sessionId: string,
    modelName: string,
    behaviorType: string,
    context: string,
    oldValue: object,
    newValue: object
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO behavior_changes 
      (session_id, model_name, behavior_type, change_context, old_value_json, new_value_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      sessionId,
      modelName,
      behaviorType,
      context,
      JSON.stringify(oldValue),
      JSON.stringify(newValue)
    );
  }


  // ============ Export & Admin Operations ============

  /**
   * Export all training data (sessions with their changes)
   */
  exportTrainingData(startDate?: Date, endDate?: Date): TrainingDataExport {
    let sessionsQuery = `SELECT session_id, started_at, ended_at FROM sessions`;
    const params: string[] = [];
    
    if (startDate || endDate) {
      const conditions: string[] = [];
      if (startDate) {
        conditions.push(`started_at >= ?`);
        params.push(startDate.toISOString());
      }
      if (endDate) {
        conditions.push(`started_at <= ?`);
        params.push(endDate.toISOString());
      }
      sessionsQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const sessionsStmt = this.db.prepare(sessionsQuery);
    const sessions = sessionsStmt.all(...params) as Array<{
      session_id: string;
      started_at: string;
      ended_at: string | null;
    }>;

    const changesStmt = this.db.prepare(`
      SELECT timestamp, model_name, behavior_type, change_context, old_value_json, new_value_json
      FROM behavior_changes WHERE session_id = ? ORDER BY timestamp
    `);

    const result: TrainingDataExport = {
      exportedAt: new Date().toISOString(),
      sessions: sessions.map(session => ({
        sessionId: session.session_id,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        changes: (changesStmt.all(session.session_id) as Array<{
          timestamp: string;
          model_name: string;
          behavior_type: string;
          change_context: string;
          old_value_json: string;
          new_value_json: string;
        }>).map(change => ({
          timestamp: change.timestamp,
          modelName: change.model_name,
          behaviorType: change.behavior_type,
          context: change.change_context,
          oldValue: JSON.parse(change.old_value_json || '{}'),
          newValue: JSON.parse(change.new_value_json || '{}'),
        })),
      })),
    };

    return result;
  }

  /**
   * Export DB configs to sidecar JSON files
   */
  exportToSidecars(modelName: string, sidecarsDir: string): void {
    const configs = this.getAllConfigs(modelName);
    
    for (const [behaviorType, config] of Object.entries(configs)) {
      const filePath = path.join(sidecarsDir, `${modelName}.vrm.${behaviorType}.json`);
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    }
  }

  /**
   * Clear all data for a model
   */
  clearModel(modelName: string): void {
    this.deleteConfig(modelName);
    // Also clear changes for this model
    const stmt = this.db.prepare(`DELETE FROM behavior_changes WHERE model_name = ?`);
    stmt.run(modelName);
  }

  /**
   * Clear entire database
   */
  clearAll(): void {
    this.db.exec(`
      DELETE FROM behavior_changes;
      DELETE FROM sessions;
      DELETE FROM behavior_configs;
    `);
  }

  /**
   * Get database statistics
   */
  getStats(): DatabaseStats {
    const configCount = (this.db.prepare(`SELECT COUNT(*) as count FROM behavior_configs`).get() as { count: number }).count;
    const sessionCount = (this.db.prepare(`SELECT COUNT(*) as count FROM sessions`).get() as { count: number }).count;
    const changeCount = (this.db.prepare(`SELECT COUNT(*) as count FROM behavior_changes`).get() as { count: number }).count;
    
    const modelCounts = this.db.prepare(`
      SELECT model_name, COUNT(*) as count FROM behavior_configs GROUP BY model_name
    `).all() as Array<{ model_name: string; count: number }>;
    
    const configsByModel: Record<string, number> = {};
    for (const row of modelCounts) {
      configsByModel[row.model_name] = row.count;
    }

    let dbSizeBytes = 0;
    try {
      const stats = fs.statSync(this.dbPath);
      dbSizeBytes = stats.size;
    } catch {
      // File might not exist yet
    }

    return {
      totalConfigs: configCount,
      totalSessions: sessionCount,
      totalChanges: changeCount,
      configsByModel,
      dbSizeBytes,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance for use in Vite plugin
let instance: BehaviorStorageService | null = null;

export function getBehaviorStorageService(dbPath?: string): BehaviorStorageService {
  if (!instance) {
    instance = new BehaviorStorageService(dbPath);
  }
  return instance;
}

export function closeBehaviorStorageService(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
