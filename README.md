# Second Brain

A private, production-grade personal knowledge system with a 3D neural
interface. Works on mobile and desktop browsers.

## Modules
- **Knowledge Graph** — the home screen. Every item orbits a wireframe brain
  in 3D. Edges connect items to their projects and to explicitly linked
  items. Drag to rotate (free trackball), pinch/scroll to zoom, ⌖ to
  re-center, search and type filters reshape the graph live.
- **Notes** — card grid with tags, search, autosaving editor.
- **Tasks** — quick-add (type + Enter), one-tap done, due dates, overdue
  highlighting.
- **Projects** — group any items; automatic task progress bars.
- **Journal** — one entry per day via the Today button.
- **Whiteboards** — freehand neon sketching: color palette, eraser, undo,
  strokes persist to the database.
- **Connections** — link any item to any other from its editor; links render
  as edges in the graph.
- **Browse (dynamic taxonomy)** — types, tags, and task statuses are all
  user-editable. Add custom types (label + color; behave like notes), custom
  tags, and custom statuses (the last status counts as "complete"). Deleting
  any of them — or a project with items — opens a reassignment dialog and
  moves affected items atomically. Built-in types are deletable too; their
  nav tab hides when gone. At least one type and two statuses always remain.

## Architecture
- One `items` table powers every module (typed rows + JSONB for links and
  board strokes). Old `notes` tables migrate automatically.
- Static frontend (no build step): `index.html`, `css/`, `js/` — Three.js
  from CDN. Serverless API in `api/`. Neon Postgres storage.
- Single-password gate (`APP_PASSWORD`), signed-cookie sessions.
- Responsive: sidebar rail ≥900px, bottom tab bar on mobile.

## Deploy to Vercel
1. Push to a Git repo, import in Vercel. Framework preset: **Other**.
2. Storage → Create Database → **Neon (Postgres)** → connect.
3. Settings → Environment Variables → `APP_PASSWORD` = your password.
4. Redeploy. Tables create/migrate automatically on first request.

## Theming
All colors are CSS variables in `css/theme.css`, including per-type identity
colors (`--type-note`, `--type-task`, …) which the 3D graph reads at runtime.
Change once, everything — cards, chips, graph nodes, edges — follows.
