import Database from "better-sqlite3";
import path from "path";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "squares.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      price_per_square REAL NOT NULL,
      payout_q1 REAL NOT NULL,
      payout_q2 REAL NOT NULL,
      payout_q3 REAL NOT NULL,
      payout_final REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_id INTEGER,
      numbers_assigned INTEGER NOT NULL DEFAULT 0,
      row_numbers TEXT,
      col_numbers TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      game_id INTEGER NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      squares_to_buy INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    CREATE TABLE IF NOT EXISTS squares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER,
      row_index INTEGER NOT NULL,
      col_index INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(game_id, row_index, col_index)
    );

    CREATE INDEX IF NOT EXISTS idx_squares_game ON squares(game_id);
    CREATE INDEX IF NOT EXISTS idx_users_game ON users(game_id);
  `);

  // Migration: add phone column for login recovery
  try {
    const info = database.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!info.some((c) => c.name === "phone")) {
      database.exec("ALTER TABLE users ADD COLUMN phone TEXT");
      database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_game_phone ON users(game_id, phone) WHERE phone IS NOT NULL");
    }
  } catch {
    // Column may already exist
  }

  // Migration: add email column and magic_tokens table
  try {
    const info = database.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!info.some((c) => c.name === "email")) {
      database.exec("ALTER TABLE users ADD COLUMN email TEXT");
      database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_game_email ON users(game_id, email) WHERE email IS NOT NULL");
    }
  } catch {
    // Column may already exist
  }

  // Migration: add picks_submitted for locking in selections
  try {
    const info = database.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!info.some((c) => c.name === "picks_submitted")) {
      database.exec("ALTER TABLE users ADD COLUMN picks_submitted INTEGER NOT NULL DEFAULT 0");
    }
  } catch {
    // Column may already exist
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS magic_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      game_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
    CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires ON magic_tokens(expires_at);
  `);
}

export function createGameSquares(gameId: number) {
  const database = getDb();
  const insert = database.prepare(
    "INSERT INTO squares (game_id, row_index, col_index) VALUES (?, ?, ?)"
  );
  const insertMany = database.transaction(() => {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        insert.run(gameId, r, c);
      }
    }
  });
  insertMany();
}

export type Game = {
  id: number;
  code: string;
  name: string;
  price_per_square: number;
  payout_q1: number;
  payout_q2: number;
  payout_q3: number;
  payout_final: number;
  status: "pending" | "started" | "completed";
  admin_id: number | null;
  numbers_assigned: number;
  row_numbers: string | null;
  col_numbers: string | null;
  created_at: string;
};

export type User = {
  id: number;
  name: string;
  game_id: number;
  is_admin: number;
  squares_to_buy: number;
  created_at: string;
};

export type Square = {
  id: number;
  game_id: number;
  user_id: number | null;
  row_index: number;
  col_index: number;
  created_at: string;
};
