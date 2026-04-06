import type { SQLiteDatabase } from 'expo-sqlite';

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS jamaats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jamaat_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      contribution REAL NOT NULL DEFAULT 0,
      join_date TEXT NOT NULL,
      leave_date TEXT,
      FOREIGN KEY (jamaat_id) REFERENCES jamaats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jamaat_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      paid_by_member_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      FOREIGN KEY (jamaat_id) REFERENCES jamaats(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by_member_id) REFERENCES members(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_members_jamaat ON members(jamaat_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_jamaat ON expenses(jamaat_id);
  `);

  const verRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let v = verRow?.user_version ?? 0;
  if (v < 2) {
    try {
      await db.execAsync('ALTER TABLE jamaats ADD COLUMN firebase_doc_id TEXT');
    } catch {
      /* column may exist */
    }
    try {
      await db.execAsync('ALTER TABLE jamaats ADD COLUMN invite_code TEXT');
    } catch {
      /* */
    }
    try {
      await db.execAsync('ALTER TABLE members ADD COLUMN user_id TEXT');
    } catch {
      /* */
    }
    try {
      await db.execAsync('ALTER TABLE members ADD COLUMN firestore_member_id TEXT');
    } catch {
      /* */
    }
    try {
      await db.execAsync('ALTER TABLE expenses ADD COLUMN firestore_expense_id TEXT');
    } catch {
      /* */
    }
    await db.execAsync('PRAGMA user_version = 2');
  }

  if (v < 3) {
    try {
      await db.execAsync('ALTER TABLE jamaats ADD COLUMN created_by_uid TEXT');
    } catch {
      /* column may exist */
    }
    await db.execAsync('PRAGMA user_version = 3');
  }
}
