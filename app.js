/* ============================================================
   SECOND BRAIN — structure & components. Colors from theme.css.
   ============================================================ */
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: var(--bg); color: var(--text);
  font-family: "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
body { overflow: hidden; }

/* ---- atmosphere (dimmed for the darker canvas) ---- */
.sky { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.sky::before, .sky::after { content: ""; position: absolute; border-radius: 50%;
  filter: blur(100px); opacity: 0.13;
  animation: drift 20s ease-in-out infinite alternate; }
.sky::before { width: 70vmax; height: 70vmax; top: -30vmax; left: -25vmax;
  background: radial-gradient(circle, rgba(139,124,255,0.26), transparent 65%); }
.sky::after { width: 60vmax; height: 60vmax; bottom: -25vmax; right: -20vmax;
  background: radial-gradient(circle, rgba(45,226,230,0.16), transparent 65%);
  animation-delay: -9s; }
@keyframes drift { from { transform: translate(0,0) scale(1); }
                   to { transform: translate(5vmax,3vmax) scale(1.12); } }

#scene { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 1; touch-action: none; }
body.page-mode #scene, body.page-mode .hud, body.page-mode .hint,
body.page-mode .nav3d, body.page-mode #boardStatus { display: none; }

/* ============================================================
   NAV RAIL — sidebar on desktop, bottom tabs on mobile
   ============================================================ */
.nav-rail { position: fixed; z-index: 20; display: flex; }
.nav-rail__brand { display: none; }
.nav-rail__item { display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--text-faint); text-decoration: none; font-size: 0.68rem; font-weight: 500;
  padding: 8px 4px; border-radius: 12px; flex: 1;
  transition: color 0.2s ease, background 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
.nav-rail__item:hover { transform: translateY(-2px); color: var(--text-muted); }
.nav-rail__item.active { color: var(--text); }
.nav-rail__icon { font-size: 1.15rem; line-height: 1;
  filter: grayscale(1) opacity(0.7); transition: filter 0.2s ease, text-shadow 0.2s ease; }
.nav-rail__item.active .nav-rail__icon { filter: none; text-shadow: 0 0 14px var(--accent); }

@media (max-width: 899px) {
  .nav-rail { left: 10px; right: 10px; bottom: 10px;
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 18px; padding: 4px 6px; backdrop-filter: blur(12px);
    box-shadow: var(--shadow); }
  .page { padding: 16px 16px 96px; }
}
@media (min-width: 900px) {
  .nav-rail { top: 0; bottom: 0; left: 0; width: 92px; flex-direction: column;
    padding: 18px 10px; gap: 6px; background: var(--panel-solid);
    border-right: 1px solid var(--border); }
  .nav-rail__brand { display: block; font-family: "Fraunces", Georgia, serif;
    font-weight: 600; font-size: 0.85rem; line-height: 1.25; text-align: center;
    margin-bottom: 14px;
    background: linear-gradient(120deg, var(--text) 30%, var(--accent) 70%, var(--accent-2));
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .nav-rail__item { flex: 0 0 auto; }
  .hud, .hint { left: 92px; }
  .page { margin-left: 92px; padding: 26px 34px 60px; }
  .nav3d { right: 22px; }
}

/* ============================================================
   GRAPH HUD (over the 3D canvas)
   ============================================================ */
.hud { position: fixed; top: 0; left: 0; right: 0; z-index: 2;
  padding: 14px 16px 8px; pointer-events: none;
  background: linear-gradient(var(--bg) 25%, transparent); }
.hud__row { display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 10px; }
.hud__title { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.55rem;
  background: linear-gradient(100deg, var(--text) 30%, var(--accent) 70%, var(--accent-2));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.hud button, .hud input { pointer-events: auto; }

.btn-new { display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 16px; border: none; border-radius: 999px;
  background: linear-gradient(120deg, var(--accent), var(--accent-2));
  color: var(--accent-text); font: inherit; font-weight: 600; font-size: 0.95rem;
  cursor: pointer; box-shadow: 0 4px 18px -2px rgba(139,124,255,0.55);
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; }
.btn-new:hover { transform: translateY(-2px) scale(1.04); }
.btn-new:active { transform: scale(0.94); }
.btn-new__plus { font-size: 1.15rem; line-height: 1; }

.search { width: 100%; border: 1px solid var(--border); background: var(--panel);
  color: var(--text); font: inherit; font-size: 0.95rem;
  border-radius: 14px; padding: 11px 15px; backdrop-filter: blur(8px);
  transition: box-shadow 0.25s ease, border-color 0.25s ease; }
.search::placeholder { color: var(--text-faint); }
.search:focus { outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(139,124,255,0.25), 0 0 24px -4px rgba(139,124,255,0.4); }

.tag-filter { display: flex; gap: 8px; flex-wrap: wrap; }
.tag-chip { display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--border); background: var(--panel);
  color: var(--text-muted); font: inherit; font-size: 0.82rem; font-weight: 500;
  border-radius: 999px; padding: 6px 13px; cursor: pointer; backdrop-filter: blur(8px);
  pointer-events: auto;
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease,
              border-color 0.25s ease, color 0.25s ease; }
.tag-chip:hover { transform: translateY(-2px); }
.tag-chip[aria-pressed="true"] { border-color: var(--accent); color: var(--text);
  box-shadow: 0 0 16px -4px rgba(139,124,255,0.55); }
.tag-chip__dot { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }

.hint { position: fixed; bottom: 84px; left: 0; right: 0; z-index: 2;
  text-align: center; font-size: 0.8rem; color: var(--text-faint);
  letter-spacing: 0.03em; pointer-events: none; transition: opacity 1s ease; }
@media (min-width: 900px) { .hint { bottom: 22px; } }
.status { position: fixed; bottom: 108px; left: 0; right: 0; z-index: 2;
  text-align: center; font-size: 0.82rem; color: var(--text-faint);
  min-height: 1.2em; pointer-events: none; }
@media (min-width: 900px) { .status { bottom: 46px; } }

.nav3d { position: fixed; right: 14px; bottom: 150px; z-index: 2;
  display: flex; flex-direction: column; gap: 10px; }
@media (min-width: 900px) { .nav3d { bottom: 60px; } }
.nav3d__btn { width: 46px; height: 46px; border-radius: 50%;
  border: 1px solid var(--border); background: var(--panel);
  color: var(--text); font-size: 1.25rem; line-height: 1; cursor: pointer;
  backdrop-filter: blur(8px); box-shadow: 0 6px 20px -6px rgba(0,0,0,0.7);
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
.nav3d__btn:hover { transform: scale(1.1); }
.nav3d__btn:active { transform: scale(0.92); }
.nav3d__btn--center { color: var(--accent-2);
  box-shadow: 0 0 18px -4px rgba(45,226,230,0.5), 0 6px 20px -6px rgba(0,0,0,0.7); }

/* ============================================================
   2D PAGES
   ============================================================ */
.page { position: fixed; inset: 0; z-index: 10; overflow-y: auto;
  background: var(--bg); animation: page-in 0.3s ease both; }
@keyframes page-in { from { opacity: 0; transform: translateY(8px); }
                     to { opacity: 1; transform: none; } }
.page-head { display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 6px; }
.page-title { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.7rem;
  background: linear-gradient(100deg, var(--text) 30%, var(--accent) 75%, var(--accent-2));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.page-sub { color: var(--text-faint); font-size: 0.85rem; margin-bottom: 16px; }
.page .search { margin: 6px 0 16px; max-width: 560px; }

.grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }

.card { position: relative; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--panel); padding: 16px; cursor: pointer; text-align: left;
  color: inherit; font: inherit; overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(139,124,255,0.14), 0 10px 32px -14px rgba(0,0,0,0.8);
  transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease,
              border-color 0.3s ease; }
.card:hover { transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--card-glow, var(--accent)) 60%, transparent);
  box-shadow: inset 0 1px 0 rgba(139,124,255,0.2),
    0 16px 40px -12px color-mix(in srgb, var(--card-glow, var(--accent)) 40%, rgba(0,0,0,0.8)); }
.card__title { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.05rem;
  line-height: 1.3; margin-bottom: 6px; overflow-wrap: anywhere; }
.card__preview { color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.card__meta { margin-top: 10px; display: flex; align-items: center; gap: 8px;
  color: var(--text-faint); font-size: 0.72rem; letter-spacing: 0.02em; }
.card__dot { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 9px currentColor; }

.type-pill { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; padding: 4px 11px; border-radius: 999px;
  border: 1px solid var(--border); color: var(--pill, var(--accent));
  box-shadow: 0 0 12px -4px var(--pill, var(--accent)); }

/* tasks */
.task-row { display: flex; align-items: center; gap: 12px;
  border: 1px solid var(--border); border-radius: 16px; background: var(--panel);
  padding: 13px 15px; margin-bottom: 10px;
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), border-color 0.25s ease; }
.task-row:hover { transform: translateX(3px); border-color: rgba(45,226,230,0.5); }
.task-check { width: 24px; height: 24px; border-radius: 8px; flex: 0 0 auto;
  border: 2px solid var(--type-task); background: transparent; cursor: pointer;
  display: grid; place-items: center; color: var(--accent-text); font-size: 0.9rem;
  transition: background 0.2s ease, box-shadow 0.2s ease; }
.task-check.done { background: var(--type-task); box-shadow: 0 0 14px -2px var(--type-task); }
.task-title { flex: 1; cursor: pointer; font-size: 0.95rem; }
.task-row.done .task-title { color: var(--text-faint); text-decoration: line-through; }
.task-due { font-size: 0.72rem; color: var(--text-faint); white-space: nowrap; }
.task-due.overdue { color: var(--danger); }
.quick-add { display: flex; gap: 10px; margin: 4px 0 18px; max-width: 560px; }
.quick-add .search { margin: 0; flex: 1; }

/* journal */
.journal-entry { border-left: 2px solid var(--type-journal); padding-left: 16px;
  margin: 0 0 18px 6px; cursor: pointer; }
.journal-entry:hover .card__title { text-shadow: 0 0 18px var(--type-journal); }
.journal-date { color: var(--type-journal); font-size: 0.72rem; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase; }

/* progress bar (projects) */
.progress { height: 6px; border-radius: 99px; background: rgba(139,124,255,0.15);
  overflow: hidden; margin-top: 10px; }
.progress__fill { height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  box-shadow: 0 0 10px rgba(45,226,230,0.6); transition: width 0.5s ease; }

/* ============================================================
   EDITOR OVERLAY
   ============================================================ */
.editor-view, .board-view { position: fixed; inset: 0; z-index: 30; background: var(--bg);
  display: flex; flex-direction: column;
  transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.34,1.3,0.64,1); }
.editor-view.open, .board-view.open { transform: translateY(0); }
.editor-view { overflow-y: auto; }
.detail-head { position: sticky; top: 0; z-index: 5; display: flex; align-items: center;
  justify-content: space-between; gap: 10px; padding: 14px 16px;
  background: linear-gradient(var(--bg) 70%, transparent); backdrop-filter: blur(6px); }
.btn-back { border: none; background: none; color: var(--accent);
  font: inherit; font-weight: 600; font-size: 1rem; cursor: pointer; padding: 6px 4px;
  white-space: nowrap; }
.btn-back:active { opacity: 0.6; }
.btn-delete { border: 1px solid var(--border); background: none; color: var(--danger);
  font: inherit; font-size: 0.85rem; font-weight: 500;
  border-radius: 999px; padding: 7px 14px; cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease; }
.btn-delete:hover { background: var(--danger-bg); box-shadow: 0 0 16px -4px rgba(255,92,122,0.45); }
.editor { display: flex; flex-direction: column; padding: 4px 18px 24px; gap: 8px;
  max-width: 780px; margin: 0 auto; width: 100%; }
.editor__title { border: none; background: none; color: var(--text);
  font-family: "Fraunces", Georgia, serif; font-weight: 600;
  font-size: 1.7rem; line-height: 1.3; padding: 10px 0; }
.editor__title::placeholder { color: var(--text-faint); }
.editor__title:focus { outline: none; }
.editor__body { border: none; background: none; color: var(--text);
  font: inherit; font-size: 1.03rem; line-height: 1.65;
  resize: none; min-height: 48dvh; padding: 4px 0 40px; }
.editor__body::placeholder { color: var(--text-faint); }
.editor__body:focus { outline: none; }
.status--save { position: static; text-align: left; padding: 0 18px 20px; }

.metarow { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.meta-select, .meta-date { border: 1px solid var(--border); background: var(--bg-elevated);
  color: var(--text); font: inherit; font-size: 0.85rem; border-radius: 12px; padding: 9px 12px; }
.meta-toggle { display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid var(--border); background: var(--bg-elevated);
  color: var(--text-muted); font: inherit; font-size: 0.85rem;
  border-radius: 999px; padding: 9px 14px; cursor: pointer; transition: all 0.2s ease; }
.meta-toggle.done { color: var(--accent-text); background: var(--type-task);
  border-color: var(--type-task); box-shadow: 0 0 16px -4px var(--type-task); }

.tagpicker { display: flex; gap: 11px; align-items: center; flex-wrap: wrap; }
.tagpicker__label, .linksrow__label { font-size: 0.8rem; color: var(--text-faint); margin-right: 2px; }
.tagpicker__swatch { width: 27px; height: 27px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; padding: 0; background-clip: padding-box;
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; }
.tagpicker__swatch:hover { transform: scale(1.18); }
.tagpicker__swatch[aria-pressed="true"] { border-color: var(--text); box-shadow: 0 0 14px 1px currentColor; }
.tagpicker__swatch--none { border: 2px dashed var(--text-faint); background: transparent; }

.linksrow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.link-chip { display: inline-flex; align-items: center; gap: 7px;
  border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-muted);
  font-size: 0.8rem; border-radius: 999px; padding: 6px 12px; }
.link-chip button { border: none; background: none; color: var(--text-faint);
  cursor: pointer; font-size: 0.95rem; line-height: 1; padding: 0; }
.link-add { border: 1px dashed var(--border); background: none; color: var(--text-faint);
  font: inherit; font-size: 0.8rem; border-radius: 999px; padding: 6px 13px; cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease; }
.link-add:hover { color: var(--accent-2); border-color: var(--accent-2); }

/* ============================================================
   WHITEBOARD
   ============================================================ */
.board-title-input { flex: 1; border: none; background: none; color: var(--text);
  font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.15rem;
  text-align: center; min-width: 0; }
.board-title-input:focus { outline: none; }
.board-actions { display: flex; gap: 8px; }
.tool-btn { width: 38px; height: 38px; border-radius: 50%;
  border: 1px solid var(--border); background: var(--panel); color: var(--text);
  cursor: pointer; font-size: 1rem;
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
.tool-btn:hover { transform: scale(1.1); }
.board-tools { display: flex; gap: 10px; align-items: center; justify-content: center;
  padding: 6px 12px 12px; flex-wrap: wrap; }
.board-swatch { width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease; }
.board-swatch:hover { transform: scale(1.15); }
.board-swatch[aria-pressed="true"] { border-color: var(--text); box-shadow: 0 0 14px 1px currentColor; }
.board-swatch--eraser { background: transparent; border: 2px dashed var(--text-faint);
  color: var(--text-faint); font-size: 0.75rem; display: grid; place-items: center; }
#boardCanvas { flex: 1; touch-action: none; cursor: crosshair; }

/* ============================================================
   PICKER / LOCK / TOAST
   ============================================================ */
.picker[hidden] { display: none; }
.picker { position: fixed; inset: 0; z-index: 45; background: rgba(1,2,6,0.7);
  display: flex; align-items: flex-end; justify-content: center; padding: 14px;
  backdrop-filter: blur(4px); }
@media (min-width: 900px) { .picker { align-items: center; } }
.picker__card { width: 100%; max-width: 460px; max-height: 70dvh;
  display: flex; flex-direction: column; gap: 12px;
  background: var(--panel-solid); border: 1px solid var(--border);
  border-radius: 22px; padding: 18px; box-shadow: var(--shadow); }
.picker__card .search { margin: 0; }
.picker__list { overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.picker__item { display: flex; align-items: center; gap: 10px; text-align: left;
  border: 1px solid transparent; background: none; color: var(--text-muted);
  font: inherit; font-size: 0.9rem; padding: 10px 12px; border-radius: 12px; cursor: pointer; }
.picker__item:hover { border-color: var(--border); color: var(--text); background: var(--bg-elevated); }

.lock[hidden] { display: none; }
.lock { position: fixed; inset: 0; z-index: 60; display: flex;
  align-items: center; justify-content: center; background: var(--bg); padding: 24px; }
.lock__card { width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 12px;
  background: var(--panel); border: 1px solid var(--border);
  border-radius: 22px; padding: 28px 24px; box-shadow: var(--shadow); backdrop-filter: blur(10px); }
.lock__title { font-family: "Fraunces", Georgia, serif; font-weight: 600;
  font-size: 1.8rem; text-align: center; }
.lock__hint { color: var(--text-muted); font-size: 0.9rem; text-align: center; }
.lock__input { border: 1px solid var(--border); background: var(--bg-elevated);
  color: var(--text); font: inherit; font-size: 1rem;
  border-radius: 12px; padding: 12px 14px; margin-top: 4px; }
.lock__input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.lock__btn { border: none; background: linear-gradient(120deg, var(--accent), var(--accent-2));
  color: var(--accent-text); font: inherit; font-weight: 600; font-size: 1rem;
  border-radius: 12px; padding: 12px; cursor: pointer; }
.lock__error { color: var(--danger); font-size: 0.85rem; text-align: center; min-height: 1em; }

.toast[hidden] { display: none; }
.toast { position: fixed; left: 50%; bottom: 86px; transform: translateX(-50%);
  z-index: 55; display: flex; align-items: center; gap: 16px;
  background: var(--panel-solid); color: var(--text);
  border: 1px solid var(--border); box-shadow: var(--shadow);
  border-radius: 999px; padding: 12px 16px 12px 20px; font-size: 0.9rem;
  animation: toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
@media (min-width: 900px) { .toast { bottom: 30px; } }
.toast__undo { border: none; background: none; color: var(--accent-2);
  font: inherit; font-weight: 600; cursor: pointer; }
@keyframes toast-in { from { opacity: 0; transform: translate(-50%, 16px); }
                      to { opacity: 1; transform: translate(-50%, 0); } }

.empty-msg { color: var(--text-faint); text-align: center; padding: 40px 20px;
  font-size: 0.95rem; line-height: 1.6; }
.empty-msg strong { color: var(--accent); }

@media (prefers-reduced-motion: reduce) {
  *, .sky::before, .sky::after { animation: none !important; transition: none !important; }
}

/* ---- Browse / manage ---- */
.picker__title { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.2rem; }
.picker__msg { color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; }
.lock__btn--ghost { background: none; border: 1px solid var(--border); color: var(--text-muted); }
.browse-section { margin-bottom: 30px; }
.browse-section h2 { font-family: "Fraunces", Georgia, serif; font-weight: 600;
  font-size: 1.1rem; margin-bottom: 12px; color: var(--text-muted); }
.type-row { display: flex; align-items: center; gap: 12px;
  border: 1px solid var(--border); border-radius: 16px; background: var(--panel);
  padding: 13px 15px; margin-bottom: 10px; cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), border-color 0.25s ease; }
.type-row:hover { transform: translateX(3px);
  border-color: color-mix(in srgb, var(--row-glow, var(--accent)) 55%, transparent); }
.type-row__dot { width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 12px currentColor; }
.type-row__name { flex: 1; font-weight: 600; }
.type-row__count { color: var(--text-faint); font-size: 0.8rem; }
.type-row__kind { font-size: 0.66rem; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-faint); border: 1px solid var(--border); border-radius: 999px; padding: 3px 8px; }
.row-x { border: none; background: none; color: var(--text-faint); font-size: 1.1rem;
  cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: color 0.2s ease; }
.row-x:hover { color: var(--danger); }
.mini-form { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 6px; }
.mini-form input[type="text"] { flex: 1; min-width: 140px; border: 1px solid var(--border);
  background: var(--bg-elevated); color: var(--text); font: inherit; font-size: 0.9rem;
  border-radius: 12px; padding: 10px 13px; }
.mini-form input[type="text"]:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.swatch-row { display: flex; gap: 8px; flex-wrap: wrap; }
.chip-manage { display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid var(--border); background: var(--panel); color: var(--text-muted);
  font-size: 0.85rem; border-radius: 999px; padding: 7px 8px 7px 14px; margin: 0 8px 8px 0; }
.chip-manage .row-x { padding: 0 4px; font-size: 1rem; }
.btn-small { border: 1px dashed var(--border); background: none; color: var(--text-faint);
  font: inherit; font-size: 0.85rem; border-radius: 999px; padding: 8px 15px; cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease; }
.btn-small:hover { color: var(--accent-2); border-color: var(--accent-2); }
.crumb { border: none; background: none; color: var(--accent); font: inherit;
  font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 12px; display: inline-block; }

/* ---- Explore toggle + region card ---- */
.nav3d__btn--explore { font-size: 1.1rem; }
.nav3d__btn--explore.active { color: var(--accent);
  box-shadow: 0 0 20px -2px var(--accent), 0 6px 20px -6px rgba(0,0,0,0.7);
  border-color: var(--accent); }
body.explore-mode .hud, body.explore-mode .hint,
body.explore-mode #zoomInBtn, body.explore-mode #zoomOutBtn { opacity: 0; pointer-events: none;
  transition: opacity 0.4s ease; }
body.explore-mode .nav-rail { opacity: 0; pointer-events: none; transition: opacity 0.4s ease; }

.region-card[hidden], .explore-hint[hidden] { display: none; }
.region-card {
  position: fixed; z-index: 6; left: 16px; right: 76px; bottom: 96px;
  max-width: 380px; margin: 0 auto;
  background: var(--panel); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 18px 20px 16px;
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow), 0 0 40px -12px var(--region-glow, var(--accent));
  animation: card-rise 0.35s cubic-bezier(0.34,1.4,0.64,1) both;
}
@media (min-width: 900px) { .region-card { left: auto; right: 28px; bottom: 32px; margin: 0; } }
@keyframes card-rise { from { opacity: 0; transform: translateY(20px); }
                       to { opacity: 1; transform: none; } }
.region-card__close { position: absolute; top: 10px; right: 12px; border: none; background: none;
  color: var(--text-faint); font-size: 1.3rem; cursor: pointer; padding: 4px; }
.region-card__name { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.25rem;
  color: var(--region-glow, var(--text)); text-shadow: 0 0 18px var(--region-glow, transparent);
  margin-bottom: 4px; }
.region-card__fn { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 10px; }
.region-card__fact { color: var(--text-faint); font-size: 0.85rem; line-height: 1.5;
  border-top: 1px solid var(--border); padding-top: 10px; }
.region-card__fact::before { content: "✦ "; color: var(--region-glow, var(--accent)); }
.explore-hint { position: fixed; z-index: 6; bottom: 30px; left: 0; right: 0; text-align: center;
  font-size: 0.8rem; color: var(--text-faint); letter-spacing: 0.03em; pointer-events: none;
  animation: fade-hint 0.5s ease both; }
@media (min-width: 900px) { .explore-hint { bottom: 22px; } }
@keyframes fade-hint { from { opacity: 0; } to { opacity: 1; } }
