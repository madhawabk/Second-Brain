// /api/reassign -> POST { field, from, to }
// Atomically moves every item with field=from to field=to.
// Used when deleting a type, tag, status, or project.
import { sql, ensureTable } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    await ensureTable();
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { field, from, to } = req.body || {};
    if (from == null) return res.status(400).json({ error: 'from required' });

    let result;
    switch (field) {           // explicit per-column queries: no dynamic SQL
      case 'type':
        result = await sql`UPDATE items SET type = ${to || 'note'}, updated_at = now() WHERE type = ${from};`;
        break;
      case 'tag':
        result = await sql`UPDATE items SET tag = ${to || ''}, updated_at = now() WHERE tag = ${from};`;
        break;
      case 'status':
        result = await sql`UPDATE items SET status = ${to || ''}, updated_at = now() WHERE status = ${from};`;
        break;
      case 'project_id':
        result = await sql`UPDATE items SET project_id = ${to || null}, updated_at = now() WHERE project_id = ${from};`;
        break;
      default:
        return res.status(400).json({ error: 'invalid field' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
