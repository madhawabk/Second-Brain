// One-time sample data for first-run experience.
// Runs at most once per database: guarded by a `seeded` flag in the meta row.
// If the user already has items (e.g. migrated notes), we set the flag
// WITHOUT inserting, so existing users never get surprise samples.
// Deleting samples later is permanent — the flag stays set.
import { randomUUID } from 'crypto';
import { sql } from './db.js';

export async function ensureSeed() {
  const metaRows = await sql`SELECT data FROM meta WHERE id = 1;`;
  const data = metaRows.length ? metaRows[0].data : {};
  if (data.seeded) return;

  const existing = await sql`SELECT COUNT(*)::int AS n FROM items;`;
  if (existing[0].n === 0) {
    const id = () => randomUUID();
    const proj = id(), note1 = id(), note2 = id();
    const day = 86400000;
    const journalTitle = new Date().toLocaleDateString([],
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const strokes = [
      { color: '#3dffa2', size: 4, erase: false, points: [[60,180],[90,120],[140,150],[200,90],[260,140]] },
      { color: '#8b7cff', size: 4, erase: false, points: [[80,220],[160,200],[240,230],[300,190]] },
    ];
    const rows = [
      [proj,  'project', 'Welcome project', 'A sample project showing how items group together. Open any item and use the project dropdown to move things in or out.', '', '', null, null, [], {}],
      [note1, 'note', 'Start here', 'This is your Second Brain. Tap the brain button (🧠) to explore the neural view. Everything you see is sample data — delete any of it, or all of it, whenever you like.', 'violet', '', null, proj, [note2], {}],
      [note2, 'note', 'Notes can link to each other', 'Open an item and use “+ Link item” under Connections. Links appear as glowing threads in the graph.', 'blue', '', null, proj, [], {}],
      [id(), 'task', 'Try checking this off', '', '', 'todo', new Date(Date.now() + 2*day).toISOString(), proj, [], {}],
      [id(), 'task', 'This one is already done', '', '', 'done', null, proj, [], {}],
      [id(), 'task', 'Add your own task (type + Enter in Tasks)', '', '', 'todo', null, null, [], {}],
      [id(), 'journal', journalTitle, 'Journal entries are one per day — tap Today to write. This sample entry was created when your Second Brain first woke up.', 'amber', '', null, null, [], {}],
      [id(), 'board', 'Sketchpad', '2 strokes', '', '', null, proj, [], { strokes }],
    ];
    for (const [rid, type, title, body, tag, status, due, pid, links, extra] of rows) {
      await sql`
        INSERT INTO items (id, type, title, body, tag, status, due_date, project_id, links, data)
        VALUES (${rid}, ${type}, ${title}, ${body}, ${tag}, ${status}, ${due},
                ${pid}, ${JSON.stringify(links)}, ${JSON.stringify(extra)});`;
    }
  }
  // set the flag either way (empty-and-seeded, or existing user opted out by default)
  const newData = { ...data, seeded: true };
  await sql`
    INSERT INTO meta (id, data) VALUES (1, ${JSON.stringify(newData)})
    ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(newData)};`;
}
