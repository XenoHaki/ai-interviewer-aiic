import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "aiic.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");

    _db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        summary TEXT DEFAULT '',
        messages TEXT NOT NULL,
        rounds INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);
    `);
  }
  return _db;
}

export type DbUser = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};

export type DbRecord = {
  id: string;
  user_id: number;
  title: string;
  created_at: string;
  summary: string;
  messages: string;
  rounds: number;
  updated_at: string;
};

export function createUser(username: string, passwordHash: string): DbUser | null {
  const db = getDb();
  try {
    const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    stmt.run(username, passwordHash);
    return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as DbUser;
  } catch {
    return null;
  }
}

export function getUserByUsername(username: string): DbUser | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM users WHERE username = ?").get(username) as DbUser) || null;
}

export function getUserById(id: number): DbUser | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser) || null;
}

export function getRecordsByUser(userId: number): DbRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM records WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50").all(userId) as DbRecord[];
}

export function upsertRecord(
  id: string,
  userId: number,
  title: string,
  createdAt: string,
  summary: string,
  messages: string,
  rounds: number,
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO records (id, user_id, title, created_at, summary, messages, rounds, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      summary = excluded.summary,
      messages = excluded.messages,
      rounds = excluded.rounds,
      updated_at = datetime('now')
  `);
  stmt.run(id, userId, title, createdAt, summary, messages, rounds);
}

export function deleteRecord(id: string, userId: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM records WHERE id = ? AND user_id = ?").run(id, userId);
  return result.changes > 0;
}
