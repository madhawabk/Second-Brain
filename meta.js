// /api/items -> GET (list), POST (create)
import { randomUUID } from 'crypto';
import { sql, ensureTable } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';
import { ensureSeed } from '../../lib/seed.js';

export default async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    await ensureTable();

    if (req.method === 'GET') {
      await ensureSeed();
      // Personal-scale app: return everything light; client filters.
      const rows = await sql`
        SELECT id, type, title, LEFT(body, 200) AS preview, tag, status,
               due_date, project_id, links, updated_at
        FROM items ORDER BY updated_at DESC;`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const id = randomUUID();
      const rows = await sql`
        INSERT INTO items (id, type, title, body, tag, status, due_date, project_id, links, data)
        VALUES (${id}, ${b.type || 'note'}, ${b.title || ''}, ${b.body || ''},
                ${b.tag || ''}, ${b.status || ''}, ${b.due_date || null},
                ${b.project_id || null}, ${JSON.stringify(b.links || [])},
                ${JSON.stringify(b.data || {})})
        RETURNING *;`;
      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
