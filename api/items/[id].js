// /api/items/[id] -> GET, PUT, DELETE
import { sql, ensureTable } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    if (!requireAuth(req, res)) return;
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM items WHERE id = ${id};`;
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'PUT') {
      const b = req.body || {};
      const rows = await sql`
        UPDATE items SET
          title = ${b.title ?? ''}, body = ${b.body ?? ''}, tag = ${b.tag ?? ''},
          status = ${b.status ?? ''}, due_date = ${b.due_date || null},
          project_id = ${b.project_id || null},
          links = ${JSON.stringify(b.links || [])},
          data = ${JSON.stringify(b.data || {})},
          updated_at = now()
        WHERE id = ${id} RETURNING *;`;
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      await sql`UPDATE items SET project_id = NULL WHERE project_id = ${id};`;
      await sql`DELETE FROM items WHERE id = ${id};`;
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
