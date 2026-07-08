/* ============================================================
   SECOND BRAIN — registry-driven app.
   Types, tags, and statuses live in META (user-editable).
   ============================================================ */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s = '') => s.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
  const todayKey = () => new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).slice(2, 6);

  const PALETTE = ['#8b7cff','#2de2e6','#ffb547','#ff6d9d','#3dffa2','#56aaff',
                   '#bd8cff','#ff8d5c','#5cffd9','#f2f5ff','#9db1d8','#ff5c7a'];

  /* ---------- state ---------- */
  let META = { types: [], tags: [], statuses: [] };
  let items = [];
  let current = null, dirty = false, saveTimer = null;
  let pendingDelete = null, toastTimer = null;
  let typeFilterVal = '', graphQuery = '';

  /* ---------- registry helpers ---------- */
  const typeOf = (id) => META.types.find(t => t.id === id) || { id, label: id, color: '#8b7cff', kind: 'note' };
  const kindOf = (id) => typeOf(id).kind || 'note';
  const typesOfKind = (k) => META.types.filter(t => (t.kind || 'note') === k);
  const tagColor = (id) => (META.tags.find(t => t.id === id) || {}).color || '';
  const doneId = () => META.statuses[META.statuses.length - 1]?.id || 'done';
  const firstStatus = () => META.statuses[0]?.id || 'todo';
  const isDone = (it) => it.status === doneId();
  const itemColor = (it) => (kindOf(it.type) === 'note' && it.tag && tagColor(it.tag))
    ? tagColor(it.tag) : typeOf(it.type).color;
  const countOfType = (id) => items.filter(i => i.type === id).length;
  async function saveMeta() { try { await API.saveMeta(META); } catch (e) { boardStatus.textContent = e.message; } }

  /* ---------- elements ---------- */
  const page = $('page'), hint = $('hint');
  const detail = $('detail'), boardView = $('board');
  const saveStatus = $('saveStatus'), boardStatus = $('boardStatus');

  /* ---------- 3D graph ---------- */
  NoteScene.init($('scene'), {
    onTap: (id) => openItem(id),
    colorOf: (it) => itemColor(it),
    labelOf: (it) => typeOf(it.type).label,
    onRegion: (reg) => showRegionCard(reg),
  });
  setTimeout(() => { hint.style.opacity = 0; }, 7000);

  const withKind = (list) => list.map(i => ({ ...i, kind: kindOf(i.type) }));
  function graphItems() {
    let list = items;
    if (typeFilterVal) list = list.filter(i => i.type === typeFilterVal);
    if (graphQuery) {
      const q = graphQuery.toLowerCase();
      list = list.filter(i => ((i.title || '') + ' ' + (i.preview || '')).toLowerCase().includes(q));
    }
    return withKind(list);
  }
  function refreshGraph() { NoteScene.setNotes(graphItems()); renderTypeFilter(); }
  function renderTypeFilter() {
    const el = $('typeFilter');
    el.innerHTML = '';
    const all = document.createElement('button');
    all.className = 'tag-chip'; all.textContent = 'All';
    all.setAttribute('aria-pressed', String(!typeFilterVal));
    all.onclick = () => { typeFilterVal = ''; refreshGraph(); };
    el.appendChild(all);
    for (const t of META.types) {
      if (!countOfType(t.id)) continue;
      const c = document.createElement('button');
      c.className = 'tag-chip';
      c.setAttribute('aria-pressed', String(typeFilterVal === t.id));
      c.innerHTML = `<span class="tag-chip__dot" style="background:${t.color};color:${t.color}"></span>${esc(t.label)}`;
      c.onclick = () => { typeFilterVal = (typeFilterVal === t.id ? '' : t.id); refreshGraph(); };
      el.appendChild(c);
    }
  }
  let graphSearchTimer = null;
  $('graphSearch').addEventListener('input', (e) => {
    clearTimeout(graphSearchTimer);
    graphSearchTimer = setTimeout(() => { graphQuery = e.target.value.trim(); refreshGraph(); }, 300);
  });
  $('zoomInBtn').onclick = () => NoteScene.zoom(-1.6);
  $('zoomOutBtn').onclick = () => NoteScene.zoom(1.6);
  $('centerBtn').onclick = () => NoteScene.recenter();

  let factTimer = null;
  function showRegionCard(reg) {
    const card = $('regionCard');
    card.style.setProperty('--region-glow', reg.hue);
    $('regionName').textContent = reg.name;
    $('regionFn').textContent = reg.fn;
    let fi = 0;
    const facts = reg.facts || [];
    $('regionFact').textContent = facts[0] || '';
    clearInterval(factTimer);
    if (facts.length > 1) factTimer = setInterval(() => {
      fi = (fi + 1) % facts.length;
      const f = $('regionFact');
      f.style.opacity = 0;
      setTimeout(() => { f.textContent = facts[fi]; f.style.opacity = 1; }, 200);
    }, 4200);
    card.hidden = false;
  }
  $('regionClose').onclick = () => { $('regionCard').hidden = true; clearInterval(factTimer); };

  function setExplore(on) {
    document.body.classList.toggle('explore-mode', on);
    $('exploreBtn').classList.toggle('active', on);
    $('exploreHint').hidden = !on;
    if (!on) { $('regionCard').hidden = true; clearInterval(factTimer); }
    NoteScene.setExplore(on);
  }
  $('exploreBtn').onclick = () => setExplore(!NoteScene.isExplore());
  $('newBtn').onclick = () => openPicker('What do you want to create?',
    META.types.map(t => ({ label: t.label, color: t.color, onPick: () => createItem(t.id) })));

  /* ---------- data ---------- */
  async function reload() {
    try {
      const [meta, list] = await Promise.all([API.meta(), API.list()]);
      META = meta; items = list;
      route();
    } catch (e) {
      if (e.message === 'unauthorized') return openLock();
      boardStatus.textContent = e.message;
    }
  }

  /* ---------- router ---------- */
  function currentView() { return (location.hash.replace('#/', '') || 'graph').split('/')[0]; }
  function routeArg() { return (location.hash.replace('#/', '')).split('/')[1] || ''; }
  const VIEWS = { graph: () => {}, notes: renderNotes, tasks: renderTasks,
    projects: renderProjects, journal: renderJournal, boards: renderBoards, browse: renderBrowse };
  function route() {
    const v = VIEWS[currentView()] ? currentView() : 'graph';
    document.querySelectorAll('.nav-rail__item').forEach(a => {
      a.classList.toggle('active', a.dataset.view === v);
      // hide built-in tabs whose kind no longer exists in the registry
      const need = { notes: 'note', tasks: 'task', projects: 'project', journal: 'journal', boards: 'board' }[a.dataset.view];
      if (need) a.style.display = typesOfKind(need).length ? '' : 'none';
    });
    if (v === 'graph') {
      document.body.classList.remove('page-mode');
      page.hidden = true; NoteScene.pause(false); refreshGraph();
    } else {
      document.body.classList.add('page-mode');
      page.hidden = false; NoteScene.pause(true); VIEWS[v]();
    }
  }
  addEventListener('hashchange', route);

  /* ---------- shared helpers ---------- */
  function pageShell(title, sub, actions = '') {
    page.innerHTML = `
      <div class="page-head"><h1 class="page-title">${title}</h1><div id="pageActions">${actions}</div></div>
      <p class="page-sub">${sub}</p><div id="pageBody"></div>`;
    return $('pageBody');
  }
  function card(it) {
    const color = itemColor(it);
    const b = document.createElement('button');
    b.className = 'card';
    b.style.setProperty('--card-glow', color);
    b.innerHTML = `
      <div class="card__title">${esc(it.title || 'Untitled')}</div>
      <div class="card__preview">${esc(it.preview || '')}</div>
      <div class="card__meta">
        <span class="card__dot" style="background:${color};color:${color}"></span>
        <span>${esc(typeOf(it.type).label)} · ${fmtDate(it.updated_at)}</span></div>`;
    b.onclick = () => kindOf(it.type) === 'board' ? openBoard(it.id) : openItem(it.id);
    return b;
  }

  /* ---------- views ---------- */
  function renderNotes() {
    const t = typesOfKind('note')[0];
    const body = pageShell('Notes', 'Everything you\'ve written down.',
      t ? `<button class="btn-new" id="pageNew"><span class="btn-new__plus">+</span><span>${esc(t.label)}</span></button>` : '');
    if (t) $('pageNew').onclick = () => createItem(t.id);
    body.innerHTML = `<input id="pageSearch" class="search" placeholder="Search…"><div class="grid" id="grid"></div>`;
    const grid = $('grid');
    const draw = (q = '') => {
      grid.innerHTML = '';
      const list = items.filter(i => kindOf(i.type) === 'note' &&
        ((i.title || '') + (i.preview || '')).toLowerCase().includes(q.toLowerCase()));
      if (!list.length) grid.innerHTML = `<p class="empty-msg">Nothing here yet.</p>`;
      list.forEach(i => grid.appendChild(card(i)));
    };
    $('pageSearch').addEventListener('input', e => draw(e.target.value));
    draw();
  }

  function renderTasks() {
    const taskType = typesOfKind('task')[0];
    const body = pageShell('Tasks', 'Check things off. Overdue turns red.');
    body.innerHTML = `<div class="quick-add"><input id="quickTask" class="search"
      placeholder="Add a task and press Enter…"></div><div id="taskList"></div>`;
    $('quickTask').addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter' || !e.target.value.trim() || !taskType) return;
      const title = e.target.value.trim(); e.target.value = '';
      await API.create({ type: taskType.id, title, status: firstStatus() });
      reload();
    });
    const list = $('taskList');
    const tasks = items.filter(i => kindOf(i.type) === 'task')
      .sort((a, b) => isDone(a) - isDone(b));
    if (!tasks.length) list.innerHTML = `<p class="empty-msg">No tasks. Type one above and press <strong>Enter</strong>.</p>`;
    for (const t of tasks) {
      const row = document.createElement('div');
      row.className = 'task-row' + (isDone(t) ? ' done' : '');
      const overdue = t.due_date && !isDone(t) && new Date(t.due_date) < new Date();
      const st = META.statuses.find(s => s.id === t.status);
      const stLabel = (st && t.status !== firstStatus() && !isDone(t)) ? `· ${esc(st.label)}` : '';
      row.innerHTML = `
        <button class="task-check ${isDone(t) ? 'done' : ''}">${isDone(t) ? '✓' : ''}</button>
        <span class="task-title">${esc(t.title || 'Untitled')} <span class="task-due">${stLabel}</span></span>
        <span class="task-due ${overdue ? 'overdue' : ''}">${t.due_date ? fmtDate(t.due_date) : ''}</span>`;
      row.querySelector('.task-check').onclick = async () => {
        const full = await API.get(t.id);
        full.status = isDone(full) ? firstStatus() : doneId();
        await API.update(t.id, full);
        reload();
      };
      row.querySelector('.task-title').onclick = () => openItem(t.id);
      list.appendChild(row);
    }
  }

  function renderProjects() {
    const pType = typesOfKind('project')[0];
    const body = pageShell('Projects', 'Group notes, tasks, and boards.',
      pType ? `<button class="btn-new" id="pageNew"><span class="btn-new__plus">+</span><span>${esc(pType.label)}</span></button>` : '');
    if (pType) $('pageNew').onclick = () => createItem(pType.id);
    body.innerHTML = `<div class="grid" id="grid"></div>`;
    const grid = $('grid');
    const projects = items.filter(i => kindOf(i.type) === 'project');
    if (!projects.length) grid.innerHTML = `<p class="empty-msg">No projects yet.</p>`;
    for (const p of projects) {
      const children = items.filter(i => i.project_id === p.id);
      const tasks = children.filter(i => kindOf(i.type) === 'task');
      const done = tasks.filter(isDone).length;
      const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
      const c = card(p);
      c.querySelector('.card__meta span:last-child').textContent += ` · ${children.length} items`;
      const prog = document.createElement('div');
      prog.className = 'progress';
      prog.innerHTML = `<div class="progress__fill" style="width:${pct}%"></div>`;
      c.appendChild(prog);
      grid.appendChild(c);
    }
  }

  function renderJournal() {
    const jType = typesOfKind('journal')[0];
    const body = pageShell('Journal', 'One entry per day.',
      jType ? `<button class="btn-new" id="todayBtn"><span class="btn-new__plus">☾</span><span>Today</span></button>` : '');
    body.innerHTML = `<div id="jlist"></div>`;
    if (jType) $('todayBtn').onclick = async () => {
      const key = todayKey();
      const existing = items.find(i => kindOf(i.type) === 'journal' && i.title === key);
      if (existing) return openItem(existing.id);
      const it = await API.create({ type: jType.id, title: key, tag: 'amber' });
      items.unshift(it); openItem(it.id, it);
    };
    const list = $('jlist');
    const entries = items.filter(i => kindOf(i.type) === 'journal');
    if (!entries.length) list.innerHTML = `<p class="empty-msg">No entries yet. Tap <strong>Today</strong>.</p>`;
    for (const e of entries) {
      const d = document.createElement('div');
      d.className = 'journal-entry';
      d.innerHTML = `<div class="journal-date">${esc(e.title)}</div>
        <div class="card__preview">${esc(e.preview || 'Empty entry')}</div>`;
      d.onclick = () => openItem(e.id);
      list.appendChild(d);
    }
  }

  function renderBoards() {
    const bType = typesOfKind('board')[0];
    const body = pageShell('Whiteboards', 'Sketch ideas freehand.',
      bType ? `<button class="btn-new" id="pageNew"><span class="btn-new__plus">+</span><span>${esc(bType.label)}</span></button>` : '');
    if (bType) $('pageNew').onclick = () => createItem(bType.id);
    body.innerHTML = `<div class="grid" id="grid"></div>`;
    const grid = $('grid');
    const boards = items.filter(i => kindOf(i.type) === 'board');
    if (!boards.length) grid.innerHTML = `<p class="empty-msg">No boards yet.</p>`;
    boards.forEach(bd => grid.appendChild(card(bd)));
  }

  /* ---------- BROWSE: taxonomy home + management ---------- */
  function renderBrowse() {
    const typeId = routeArg();
    if (typeId) return renderTypeDetail(typeId);
    const body = pageShell('Browse', 'Your types, tags, and statuses. Add, remove, reorganize.');
    body.innerHTML = `
      <div class="browse-section"><h2>Types</h2><div id="typeList"></div>
        <div class="mini-form" id="typeForm">
          <input type="text" id="newTypeName" placeholder="New type name…" maxlength="24">
          <div class="swatch-row" id="typeSwatches"></div>
          <button class="btn-small" id="addTypeBtn">+ Add type</button></div></div>
      <div class="browse-section"><h2>Tags</h2><div id="tagList"></div>
        <div class="mini-form" id="tagForm">
          <input type="text" id="newTagName" placeholder="New tag name…" maxlength="20">
          <div class="swatch-row" id="tagSwatches"></div>
          <button class="btn-small" id="addTagBtn">+ Add tag</button></div></div>
      <div class="browse-section"><h2>Task statuses <span class="type-row__count">(last = complete)</span></h2>
        <div id="statusList"></div>
        <div class="mini-form">
          <input type="text" id="newStatusName" placeholder="New status name…" maxlength="20">
          <button class="btn-small" id="addStatusBtn">+ Add status</button></div></div>`;

    // types
    const tl = $('typeList');
    for (const t of META.types) {
      const row = document.createElement('div');
      row.className = 'type-row';
      row.style.setProperty('--row-glow', t.color);
      const kind = t.kind && t.kind !== 'note' ? `<span class="type-row__kind">${t.kind}</span>` : '';
      row.innerHTML = `
        <span class="type-row__dot" style="background:${t.color};color:${t.color}"></span>
        <span class="type-row__name">${esc(t.label)}</span>${kind}
        <span class="type-row__count">${countOfType(t.id)} items</span>
        ${META.types.length > 1 ? '<button class="row-x" aria-label="Delete type">×</button>' : ''}`;
      row.onclick = (e) => { if (!e.target.classList.contains('row-x')) location.hash = `#/browse/${t.id}`; };
      const x = row.querySelector('.row-x');
      if (x) x.onclick = () => deleteType(t);
      tl.appendChild(row);
    }
    let typeColorPick = PALETTE[0];
    swatchRow($('typeSwatches'), c => typeColorPick = c);
    $('addTypeBtn').onclick = async () => {
      const name = $('newTypeName').value.trim();
      if (!name) return;
      META.types.push({ id: slug(name), label: name, color: typeColorPick, kind: 'note' });
      await saveMeta(); reload();
    };

    // tags
    const tgl = $('tagList');
    for (const t of META.tags) {
      const chip = document.createElement('span');
      chip.className = 'chip-manage';
      chip.innerHTML = `<span class="tag-chip__dot" style="background:${t.color};color:${t.color}"></span>
        ${esc(t.id)} <button class="row-x" aria-label="Delete tag">×</button>`;
      chip.querySelector('.row-x').onclick = () => deleteTag(t);
      tgl.appendChild(chip);
    }
    let tagColorPick = PALETTE[3];
    swatchRow($('tagSwatches'), c => tagColorPick = c);
    $('addTagBtn').onclick = async () => {
      const name = $('newTagName').value.trim().toLowerCase();
      if (!name || META.tags.some(t => t.id === name)) return;
      META.tags.push({ id: name, color: tagColorPick });
      await saveMeta(); reload();
    };

    // statuses
    const sl = $('statusList');
    for (const s of META.statuses) {
      const chip = document.createElement('span');
      chip.className = 'chip-manage';
      const isLast = s.id === doneId();
      chip.innerHTML = `${esc(s.label)}${isLast ? ' ✓' : ''}
        ${META.statuses.length > 2 ? '<button class="row-x" aria-label="Delete status">×</button>' : ''}`;
      const x = chip.querySelector('.row-x');
      if (x) x.onclick = () => deleteStatus(s);
      sl.appendChild(chip);
    }
    $('addStatusBtn').onclick = async () => {
      const name = $('newStatusName').value.trim();
      if (!name) return;
      // insert before the final ("complete") status
      META.statuses.splice(META.statuses.length - 1, 0, { id: slug(name), label: name });
      await saveMeta(); reload();
    };
  }

  function swatchRow(el, onPick) {
    let sel = null;
    PALETTE.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'tagpicker__swatch';
      b.style.background = c; b.style.color = c;
      b.setAttribute('aria-pressed', String(i === 0));
      if (i === 0) sel = b;
      b.onclick = () => { sel?.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-pressed', 'true'); sel = b; onPick(c); };
      el.appendChild(b);
    });
  }

  function renderTypeDetail(typeId) {
    const t = typeOf(typeId);
    const body = pageShell(esc(t.label),
      `Everything of this type.`,
      `<button class="btn-new" id="pageNew"><span class="btn-new__plus">+</span><span>${esc(t.label)}</span></button>`);
    $('pageNew').onclick = () => createItem(t.id);
    body.innerHTML = `<button class="crumb" onclick="location.hash='#/browse'">← All types</button>
      <div class="grid" id="grid"></div>`;
    const grid = $('grid');
    const list = items.filter(i => i.type === typeId);
    if (!list.length) grid.innerHTML = `<p class="empty-msg">Nothing of this type yet.</p>`;
    list.forEach(i => grid.appendChild(card(i)));
  }

  /* ---------- reassignment deletes ---------- */
  function openReassign({ title, msg, options, onConfirm }) {
    $('reassignTitle').textContent = title;
    $('reassignMsg').textContent = msg;
    const list = $('reassignList');
    list.innerHTML = '';
    options.forEach(o => {
      const b = document.createElement('button');
      b.className = 'picker__item';
      b.innerHTML = `<span class="card__dot" style="background:${o.color};color:${o.color}"></span>${esc(o.label)}`;
      b.onclick = async () => { $('reassign').hidden = true; await onConfirm(o.value); };
      list.appendChild(b);
    });
    $('reassign').hidden = false;
  }
  $('reassignCancel').onclick = () => { $('reassign').hidden = true; };
  $('reassign').addEventListener('click', (e) => { if (e.target === $('reassign')) $('reassign').hidden = true; });

  async function deleteType(t) {
    const n = countOfType(t.id);
    const others = META.types.filter(x => x.id !== t.id);
    const finish = async (targetId) => {
      if (n) await API.reassign('type', t.id, targetId);
      META.types = others;
      await saveMeta(); reload();
    };
    if (!n) return openReassign({
      title: `Delete "${t.label}"?`, msg: 'No items use this type.',
      options: [{ label: 'Delete type', color: 'var(--danger)', value: null }],
      onConfirm: () => finish(others[0].id) });
    openReassign({
      title: `Delete "${t.label}"`,
      msg: `${n} item${n > 1 ? 's' : ''} use this type. Choose where they go — items keep their content, but change behavior to the new type.`,
      options: others.map(o => ({ label: `Move to ${o.label}`, color: o.color, value: o.id })),
      onConfirm: finish });
  }

  async function deleteTag(t) {
    const n = items.filter(i => i.tag === t.id).length;
    const finish = async (target) => {
      if (n) await API.reassign('tag', t.id, target);
      META.tags = META.tags.filter(x => x.id !== t.id);
      await saveMeta(); reload();
    };
    if (!n) return finish('');
    openReassign({
      title: `Delete tag "${t.id}"`,
      msg: `${n} item${n > 1 ? 's' : ''} carry this tag.`,
      options: [{ label: 'Remove tag from them', color: 'var(--text-faint)', value: '' },
        ...META.tags.filter(x => x.id !== t.id)
          .map(o => ({ label: `Retag as ${o.id}`, color: o.color, value: o.id }))],
      onConfirm: finish });
  }

  async function deleteStatus(s) {
    const n = items.filter(i => i.status === s.id).length;
    const others = META.statuses.filter(x => x.id !== s.id);
    const finish = async (target) => {
      if (n) await API.reassign('status', s.id, target);
      META.statuses = others;
      await saveMeta(); reload();
    };
    if (!n) return finish(others[0].id);
    openReassign({
      title: `Delete status "${s.label}"`,
      msg: `${n} task${n > 1 ? 's' : ''} have this status.`,
      options: others.map(o => ({ label: `Move to ${o.label}`, color: 'var(--type-task)', value: o.id })),
      onConfirm: finish });
  }

  /* ---------- create ---------- */
  async function createItem(typeId) {
    closePicker();
    const kind = kindOf(typeId);
    if (kind === 'journal') {
      const key = todayKey();
      const existing = items.find(i => kindOf(i.type) === 'journal' && i.title === key);
      if (existing) return openItem(existing.id);
    }
    const it = await API.create({
      type: typeId,
      title: kind === 'journal' ? todayKey() : '',
      status: kind === 'task' ? firstStatus() : '',
      tag: kind === 'journal' ? (META.tags.find(t => t.id === 'amber') ? 'amber' : '') : '',
    });
    items.unshift(it);
    if (kind === 'board') openBoard(it.id, it);
    else openItem(it.id, it);
  }

  /* ---------- editor ---------- */
  function openEditor() { detail.classList.add('open'); detail.setAttribute('aria-hidden', 'false'); NoteScene.pause(true); }
  function closeEditor() {
    detail.classList.remove('open'); detail.setAttribute('aria-hidden', 'true');
    if (currentView() === 'graph') NoteScene.pause(false);
  }

  async function openItem(id, preloaded) {
    openEditor();
    saveStatus.textContent = preloaded ? '' : 'Loading…';
    $('titleInput').value = ''; $('bodyInput').value = '';
    try {
      current = preloaded || await API.get(id);
      if (kindOf(current.type) === 'board') { closeEditor(); return openBoard(id, current); }
      $('titleInput').value = current.title || '';
      $('bodyInput').value = current.body || '';
      const t = typeOf(current.type);
      const pill = $('editorType');
      pill.textContent = t.label;
      pill.style.setProperty('--pill', t.color);
      renderMeta(); renderTagPicker(); renderLinks();
      saveStatus.textContent = ''; dirty = false;
    } catch (e) { saveStatus.textContent = e.message; }
  }

  function renderMeta() {
    const row = $('metaRow');
    row.innerHTML = '';
    const kind = kindOf(current.type);
    if (kind === 'task') {
      const done = isDone(current);
      const tgl = document.createElement('button');
      tgl.className = 'meta-toggle' + (done ? ' done' : '');
      tgl.textContent = done ? '✓ Done' : 'Mark done';
      tgl.onclick = () => { current.status = done ? firstStatus() : doneId(); renderMeta(); scheduleSave(); };
      row.appendChild(tgl);
      const sel = document.createElement('select');
      sel.className = 'meta-select';
      sel.innerHTML = META.statuses.map(s =>
        `<option value="${s.id}" ${current.status === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
      sel.onchange = () => { current.status = sel.value; renderMeta(); scheduleSave(); };
      row.appendChild(sel);
      const due = document.createElement('input');
      due.type = 'date'; due.className = 'meta-date';
      if (current.due_date) due.value = new Date(current.due_date).toISOString().slice(0, 10);
      due.onchange = () => { current.due_date = due.value ? new Date(due.value).toISOString() : null; scheduleSave(); };
      row.appendChild(due);
    }
    if (kind !== 'project') {
      const projects = items.filter(i => kindOf(i.type) === 'project');
      if (projects.length) {
        const sel = document.createElement('select');
        sel.className = 'meta-select';
        sel.innerHTML = `<option value="">No project</option>` + projects
          .map(p => `<option value="${p.id}" ${current.project_id === p.id ? 'selected' : ''}>${esc(p.title || 'Untitled')}</option>`).join('');
        sel.onchange = () => { current.project_id = sel.value || null; scheduleSave(); };
        row.appendChild(sel);
      }
    }
  }

  function renderTagPicker() {
    const el = $('tagPicker');
    const kind = kindOf(current.type);
    if (!['note', 'journal'].includes(kind)) { el.innerHTML = ''; return; }
    el.innerHTML = '<span class="tagpicker__label">Tag</span>';
    const none = document.createElement('button');
    none.className = 'tagpicker__swatch tagpicker__swatch--none';
    none.setAttribute('aria-pressed', String(!current.tag));
    none.onclick = () => { current.tag = ''; renderTagPicker(); scheduleSave(); };
    el.appendChild(none);
    for (const t of META.tags) {
      const b = document.createElement('button');
      b.className = 'tagpicker__swatch';
      b.style.background = t.color; b.style.color = t.color; b.title = t.id;
      b.setAttribute('aria-pressed', String(current.tag === t.id));
      b.onclick = () => { current.tag = t.id; renderTagPicker(); scheduleSave(); };
      el.appendChild(b);
    }
  }

  function renderLinks() {
    const el = $('linksRow');
    el.innerHTML = '<span class="linksrow__label">Connections</span>';
    for (const lid of (current.links || [])) {
      const target = items.find(i => i.id === lid);
      const chip = document.createElement('span');
      chip.className = 'link-chip';
      chip.innerHTML = `${esc(target ? (target.title || 'Untitled') : 'Missing')} <button aria-label="Remove link">×</button>`;
      chip.querySelector('button').onclick = () => {
        current.links = current.links.filter(x => x !== lid);
        renderLinks(); scheduleSave();
      };
      el.appendChild(chip);
    }
    const add = document.createElement('button');
    add.className = 'link-add'; add.textContent = '+ Link item';
    add.onclick = () => openPicker('Link to…',
      items.filter(i => i.id !== current.id && !(current.links || []).includes(i.id))
        .map(i => ({ label: `${typeOf(i.type).label} · ${i.title || 'Untitled'}`,
          color: itemColor(i),
          onPick: () => { current.links = [...(current.links || []), i.id];
            renderLinks(); scheduleSave(); closePicker(); } })));
    el.appendChild(add);
  }

  function scheduleSave() {
    dirty = true; saveStatus.textContent = 'Saving…';
    clearTimeout(saveTimer); saveTimer = setTimeout(save, 600);
  }
  async function save() {
    if (!current || !dirty) return;
    try {
      current.title = $('titleInput').value;
      current.body = $('bodyInput').value;
      await API.update(current.id, current);
      dirty = false; saveStatus.textContent = 'Saved';
    } catch (e) { saveStatus.textContent = e.message; }
  }
  $('titleInput').addEventListener('input', scheduleSave);
  $('bodyInput').addEventListener('input', scheduleSave);

  $('backBtn').onclick = async () => {
    clearTimeout(saveTimer);
    if (dirty) await save();
    closeEditor(); current = null; reload();
  };

  $('deleteBtn').onclick = async () => {
    if (!current) return;
    const full = current;
    const kind = kindOf(full.type);
    clearTimeout(saveTimer); dirty = false;
    // deleting a project with children → reassign popup first
    if (kind === 'project') {
      const children = items.filter(i => i.project_id === full.id);
      if (children.length) {
        const others = items.filter(i => kindOf(i.type) === 'project' && i.id !== full.id);
        return openReassign({
          title: `Delete "${full.title || 'Untitled'}"`,
          msg: `${children.length} item${children.length > 1 ? 's' : ''} belong to this project.`,
          options: [{ label: 'Detach them (no project)', color: 'var(--text-faint)', value: '' },
            ...others.map(o => ({ label: `Move to ${o.title || 'Untitled'}`,
              color: itemColor(o), value: o.id }))],
          onConfirm: async (target) => {
            await API.reassign('project_id', full.id, target || null);
            await API.remove(full.id);
            closeEditor(); current = null;
            showUndo(full); reload();
          } });
      }
    }
    await API.remove(full.id);
    closeEditor(); current = null;
    showUndo(full); reload();
  };

  /* ---------- undo ---------- */
  function showUndo(item) {
    pendingDelete = item;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; pendingDelete = null; }, 5000);
  }
  $('toastUndo').onclick = async () => {
    if (!pendingDelete) return;
    const n = pendingDelete; pendingDelete = null; $('toast').hidden = true;
    await API.create({ type: n.type, title: n.title, body: n.body, tag: n.tag,
      status: n.status, due_date: n.due_date, project_id: n.project_id,
      links: n.links, data: n.data });
    reload();
  };

  /* ---------- picker ---------- */
  let pickerOptions = [];
  function openPicker(placeholder, options) {
    pickerOptions = options;
    $('pickerSearch').value = ''; $('pickerSearch').placeholder = placeholder;
    drawPicker('');
    $('picker').hidden = false;
    $('pickerSearch').focus();
  }
  function drawPicker(q) {
    const list = $('pickerList');
    list.innerHTML = '';
    pickerOptions.filter(o => o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 60)
      .forEach(o => {
        const b = document.createElement('button');
        b.className = 'picker__item';
        b.innerHTML = `<span class="card__dot" style="background:${o.color};color:${o.color}"></span>${esc(o.label)}`;
        b.onclick = o.onPick;
        list.appendChild(b);
      });
    if (!list.children.length) list.innerHTML = '<p class="empty-msg">Nothing matches.</p>';
  }
  function closePicker() { $('picker').hidden = true; }
  $('pickerSearch').addEventListener('input', e => drawPicker(e.target.value));
  $('pickerClose').onclick = closePicker;
  $('picker').addEventListener('click', (e) => { if (e.target === $('picker')) closePicker(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePicker(); $('reassign').hidden = true; } });

  /* ---------- whiteboard ---------- */
  const bCanvas = $('boardCanvas');
  const bCtx = bCanvas.getContext('2d');
  let boardItem = null, strokes = [], activeStroke = null;
  let penColor = '#f2f5ff', erasing = false;

  function renderBoardTools() {
    const el = $('boardTools');
    el.innerHTML = '';
    const colors = ['#f2f5ff', ...META.tags.map(t => t.color)];
    for (const c of colors) {
      const b = document.createElement('button');
      b.className = 'board-swatch';
      b.style.background = c; b.style.color = c;
      b.setAttribute('aria-pressed', String(!erasing && penColor === c));
      b.onclick = () => { penColor = c; erasing = false; renderBoardTools(); };
      el.appendChild(b);
    }
    const er = document.createElement('button');
    er.className = 'board-swatch board-swatch--eraser';
    er.textContent = '⌫';
    er.setAttribute('aria-pressed', String(erasing));
    er.onclick = () => { erasing = !erasing; renderBoardTools(); };
    el.appendChild(er);
  }
  function resizeBoard() {
    const r = bCanvas.getBoundingClientRect();
    bCanvas.width = r.width * devicePixelRatio;
    bCanvas.height = r.height * devicePixelRatio;
    redraw();
  }
  function redraw() {
    bCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    bCtx.clearRect(0, 0, bCanvas.width, bCanvas.height);
    for (const s of strokes) drawStroke(s);
    if (activeStroke) drawStroke(activeStroke);
  }
  function drawStroke(s) {
    if (s.points.length < 2) return;
    bCtx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    bCtx.strokeStyle = s.color; bCtx.lineWidth = s.size;
    bCtx.lineCap = 'round'; bCtx.lineJoin = 'round';
    if (!s.erase) { bCtx.shadowColor = s.color; bCtx.shadowBlur = 6; } else bCtx.shadowBlur = 0;
    bCtx.beginPath();
    bCtx.moveTo(s.points[0][0], s.points[0][1]);
    for (const [x, y] of s.points.slice(1)) bCtx.lineTo(x, y);
    bCtx.stroke();
    bCtx.shadowBlur = 0;
    bCtx.globalCompositeOperation = 'source-over';
  }
  bCanvas.addEventListener('pointerdown', (e) => {
    bCanvas.setPointerCapture(e.pointerId);
    activeStroke = { color: penColor, size: erasing ? 26 : 4, erase: erasing,
      points: [[e.offsetX, e.offsetY]] };
  });
  bCanvas.addEventListener('pointermove', (e) => {
    if (!activeStroke) return;
    activeStroke.points.push([e.offsetX, e.offsetY]);
    redraw();
  });
  const endStroke = () => {
    if (!activeStroke) return;
    if (activeStroke.points.length > 1) strokes.push(activeStroke);
    activeStroke = null; redraw();
  };
  bCanvas.addEventListener('pointerup', endStroke);
  bCanvas.addEventListener('pointercancel', endStroke);
  $('boardUndo').onclick = () => { strokes.pop(); redraw(); };
  $('boardClear').onclick = () => { strokes = []; redraw(); };

  async function openBoard(id, preloaded) {
    boardItem = preloaded || await API.get(id);
    strokes = (boardItem.data && boardItem.data.strokes) || [];
    penColor = '#f2f5ff'; erasing = false;
    $('boardTitle').value = boardItem.title || '';
    renderBoardTools();
    boardView.classList.add('open'); boardView.setAttribute('aria-hidden', 'false');
    NoteScene.pause(true);
    requestAnimationFrame(resizeBoard);
  }
  function closeBoardView() {
    boardView.classList.remove('open'); boardView.setAttribute('aria-hidden', 'true');
    if (currentView() === 'graph') NoteScene.pause(false);
  }
  $('boardDelete').onclick = async () => {
    if (!boardItem) return;
    const full = { ...boardItem, data: { ...(boardItem.data || {}), strokes } };
    await API.remove(boardItem.id);
    boardItem = null; closeBoardView();
    showUndo(full); reload();
  };
  $('boardBack').onclick = async () => {
    if (boardItem) {
      boardItem.title = $('boardTitle').value;
      boardItem.data = { ...(boardItem.data || {}), strokes };
      boardItem.body = `${strokes.length} strokes`;
      await API.update(boardItem.id, boardItem);
    }
    boardItem = null; closeBoardView(); reload();
  };
  addEventListener('resize', () => { if (boardView.classList.contains('open')) resizeBoard(); });

  /* ---------- login ---------- */
  function openLock() { $('lock').hidden = false; $('lockInput').focus(); }
  $('lockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('lockError').textContent = '';
    const ok = await API.login($('lockInput').value);
    if (ok) { $('lock').hidden = true; $('lockInput').value = ''; reload(); }
    else { $('lockError').textContent = 'Wrong password. Try again.'; }
  });

  /* ---------- start ---------- */
  addEventListener('beforeunload', () => { if (dirty) save(); });
  (async () => {
    try {
      const s = await API.authStatus();
      if (s.required && !s.authed) { openLock(); return; }
    } catch {}
    reload();
  })();
})();
