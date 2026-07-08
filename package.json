// Unified data layer: one `items` table powers notes, tasks, journal,
// projects, and whiteboards. Old `notes` rows are migrated automatically.
import { neon } from '@neondatabase/serverless';
export const sql = neon(process.env.DATABASE_URL);

let ensured = false;
export async function ensureTable() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS items (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL DEFAULT 'note',
      title      TEXT NOT NULL DEFAULT '',
      body       TEXT NOT NULL DEFAULT '',
      tag        TEXT NOT NULL DEFAULT '',
      status     TEXT NOT NULL DEFAULT '',
      due_date   TIMESTAMPTZ,
      project_id TEXT,
      links      JSONB NOT NULL DEFAULT '[]',
      data       JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`;
  // one-time migration from the old notes table, if it exists
  try {
    await sql`
      INSERT INTO items (id, type, title, body, tag, created_at, updated_at)
      SELECT id, 'note', title, body, tag, created_at, updated_at FROM notes
      ON CONFLICT (id) DO NOTHING;`;
  } catch { /* no old table — fresh install */ }
  await sql`
    CREATE TABLE IF NOT EXISTS meta (
      id   INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL DEFAULT '{}'
    );`;
  ensured = true;
}
