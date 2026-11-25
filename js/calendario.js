// Calendário Bíblico: mês com compromissos pessoais (com etiquetas), datas cristãs,
// leituras do devocional e avisos da comunidade (publicados pela administração, visíveis a todos).
// Dados: Store 'events' (pessoal), 'tags' (pessoal), 'announcements' (comunidade).

const Cal = (() => {
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const COLORS = {
    gold: { bg: '#FFEBC4', fg: '#7A4200', label: 'amarelo' },
    navy: { bg: '#DDE8F5', fg: '#1F4A78', label: 'azul' },
    green: { bg: '#DDEFE2', fg: '#245C3A', label: 'verde' },
    rose: { bg: '#F8DEE3', fg: '#8A2A40', label: 'rosa' },
    lilac: { bg: '#E8E0F5', fg: '#4E3A7A', label: 'lilás' },
    teal: { bg: '#D6EEF0', fg: '#1F5B63', label: 'turquesa' },
    orange: { bg: '#FBE3CF', fg: '#8A4513', label: 'laranja' },
    gray: { bg: '#E9E7E2', fg: '#4A4A4A', label: 'cinza' },
  };
  const KINDS = {
    encontro: { label: 'Encontro ao vivo', icon: 'video' },
    oracao: { label: 'Pedido de oração', icon: 'heart' },
    aviso: { label: 'Aviso', icon: 'megaphone' },
  };

  // ---------- datas ----------
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayKey = () => keyOf(new Date());
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const longDate = (k) => cap(dateOf(k).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- datas cristãs ----------
  function easter(y) { // algoritmo de Meeus/Jones/Butcher
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }

  const holCache = {};
  function holidaysOf(y) {
    if (holCache[y]) return holCache[y];
    const map = {};
    const add = (d, name) => { (map[keyOf(d)] ||= []).push(name); };
    const e = easter(y);
    add(new Date(y, 0, 6), 'Epifania (Dia de Reis)');
    add(addDays(e, -46), 'Quarta-feira de Cinzas');
    add(addDays(e, -7), 'Domingo de Ramos');
    add(addDays(e, -3), 'Quinta-feira Santa');
    add(addDays(e, -2), 'Sexta-feira da Paixão');
    add(e, 'Páscoa');
    add(addDays(e, 39), 'Ascensão de Jesus');
    add(addDays(e, 49), 'Pentecostes');
    add(addDays(e, 60), 'Corpus Christi');
    add(new Date(y, 9, 31), 'Dia da Reforma Protestante');
    const nov1 = new Date(y, 10, 1).getDay();
    add(new Date(y, 10, 1 + ((4 - nov1 + 7) % 7) + 21), 'Dia de Ação de Graças');
    add(new Date(y, 10, 30), 'Dia Nacional do Evangélico');
    const xmas = new Date(y, 11, 25);
    const advent4 = addDays(xmas, -(xmas.getDay() || 7));
    for (let i = 3; i >= 0; i--) add(addDays(advent4, -7 * i), `${4 - i}º domingo do Advento`);
    const dec1 = new Date(y, 11, 1).getDay();
    add(new Date(y, 11, 1 + ((7 - dec1) % 7) + 7), 'Dia da Bíblia');
    add(new Date(y, 11, 24), 'Véspera de Natal');
    add(xmas, 'Natal');
    return (holCache[y] = map);
  }
  const holidaysOn = (k) => holidaysOf(+k.slice(0, 4))[k] || [];

  // ---------- dados ----------
  const events = () => Store.get('events') || [];
  const tags = () => Store.get('tags') || [];
  const anns = () => Store.get('announcements') || [];
  const isAdmin = () => (Store.get('profile').role || 'admin') === 'admin';
  const tagOf = (id) => tags().find((t) => t.id === id);
  const colorOf = (id) => COLORS[tagOf(id)?.color] || COLORS.gray;
  const tagStyle = (id) => { const c = colorOf(id); return `--bg:${c.bg};--fg:${c.fg}`; };
  const byTime = (a, b) => (a.time || '99').localeCompare(b.time || '99');
  const safeLink = (u) => /^https?:\/\//i.test(u || '');
  function upsert(key, item) {
    const list = Store.get(key) || [];
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item; else list.push(item);
    Store.set(key, list);
  }

  function itemsOn(k) {
    return {
      hol: holidaysOn(k),
      anns: anns().filter((a) => a.date === k).sort(byTime),
      devo: Devo.entry(k).ref || '',
      evs: events().filter((e) => e.date === k).sort(byTime),
    };
  }

  // ---------- mês ----------
  let view = null; // { y, m }
  const timeTxt = (t) => (t ? `<b>${t}</b> ` : '');
  const chipAnn = (a) => `<button class="chip chip-ann" data-ann="${a.id}" title="${esc(KINDS[a.kind]?.label)}: ${esc(a.title)}">${icon(KINDS[a.kind]?.icon || 'megaphone', 12)}<span>${timeTxt(a.time)}${esc(a.title)}</span></button>`;
  const chipDevo = (k, ref) => `<button class="chip chip-devo" data-devo-day="${k}" title="Leitura do devocional: ${esc(ref)}">${icon('bookOpen', 12)}<span>${esc(ref)}</span></button>`;
  const chipEv = (e) => `<button class="chip" data-ev="${e.id}" style="${tagStyle(e.tagId)}" title="${esc(e.title)}"><span>${timeTxt(e.time)}${esc(e.title)}</span></button>`;

  function cell(k, inMonth, today) {
    const it = itemsOn(k);
    const chips = [...it.anns.map(chipAnn), ...(it.devo ? [chipDevo(k, it.devo)] : []), ...it.evs.map(chipEv)];
    const MAX = 3;
    const shown = chips.slice(0, chips.length > MAX ? MAX - 1 : MAX);
    const more = chips.length - shown.length;
    const dots = [
      ...it.anns.map(() => '<i class="dot dot-ann"></i>'),
      ...(it.devo ? ['<i class="dot dot-devo"></i>'] : []),
      ...it.evs.map((e) => `<i class="dot" style="${tagStyle(e.tagId)}"></i>`),
    ].slice(0, 4).join('');
    const cls = ['cal-cell', !inMonth && 'out', k === today && 'today', it.hol.length && 'holiday'].filter(Boolean).join(' ');
    const label = `${longDate(k)}${k === today ? ' (hoje)' : ''}${it.hol.length ? ', ' + it.hol.join(', ') : ''}${chips.length ? `, ${chips.length} ${chips.length > 1 ? 'itens' : 'item'}` : ''}`;
    return `<div class="${cls}" data-cell="${k}">
      <button class="cal-num" data-open="${k}" aria-label="${esc(label)}">${dateOf(k).getDate()}</button>
      ${it.hol.length ? `<span class="cal-hol">${esc(it.hol.join(' · '))}</span>` : ''}
      <div class="cal-chips">${shown.join('')}${more ? `<button class="chip-more" data-day="${k}">+${more} mais</button>` : ''}</div>
      <div class="cal-dots" aria-hidden="true">${dots}</div>
    </div>`;
  }

  function render() {
    const now = new Date();
    if (!view) view = { y: now.getFullYear(), m: now.getMonth() };
    const first = new Date(view.y, view.m, 1);
    const start = addDays(first, -first.getDay());
    const weeks = Math.ceil((first.getDay() + new Date(view.y, view.m + 1, 0).getDate()) / 7);
    const today = todayKey();
    const cells = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(start, i);
      cells.push(cell(keyOf(d), d.getMonth() === view.m, today));
    }
    const isCurrent = view.y === now.getFullYear() && view.m === now.getMonth();
    return `
      <div class="devo-bar">
        <div class="week-nav">
          <button class="icon-btn sm" data-cal="prev" aria-label="Mês anterior">${icon('chevronLeft', 18)}</button>
          <h2 class="cal-month">${cap(MESES[view.m])} ${view.y}</h2>
          <button class="icon-btn sm" data-cal="next" aria-label="Próximo mês">${icon('chevronRight', 18)}</button>
        </div>
        <div class="devo-bar-actions">
          ${isCurrent ? '' : '<button class="btn btn-soft btn-sm" data-cal="today">hoje</button>'}
          <button class="btn btn-navy btn-sm" data-cal="new">${icon('plus', 16)} novo compromisso</button>
        </div>
      </div>
      <div class="cal">
        <div class="cal-head" aria-hidden="true">${WD.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid">${cells.join('')}</div>
      </div>
      <div class="cal-legend">
        <span><i class="lg lg-hol"></i>datas cristãs</span>
        <span><i class="lg lg-ann"></i>avisos da comunidade</span>
        <span><i class="lg lg-devo"></i>leitura do devocional</span>
        <span><i class="lg lg-today"></i>hoje</span>
      </div>`;
  }

  function rerender(focusSel) {
    refreshContent();
    if (focusSel) document.querySelector(focusSel)?.focus();
  }

  const isMobile = () => matchMedia('(max-width: 640px)').matches;

  function onClick(e) {
    const t = e.target;
    const nav = t.closest('[data-cal]');
    if (nav) {
      const a = nav.dataset.cal;
      if (a === 'prev' || a === 'next') {
        const d = new Date(view.y, view.m + (a === 'prev' ? -1 : 1), 1);
        view = { y: d.getFullYear(), m: d.getMonth() };
        rerender(`[data-cal="${a}"]`);
      }
      if (a === 'today') { view = null; rerender('.cal-cell.today .cal-num'); }
      if (a === 'new') openForm({ date: todayKey() });
      return;
    }
    // No celular as células são pequenas: tocar no dia abre o resumo do dia.
    if (isMobile()) { const c = t.closest('[data-cell]'); if (c) openDay(c.dataset.cell); return; }

    const ev = t.closest('[data-ev]');
    if (ev) return openForm(events().find((x) => x.id === ev.dataset.ev));
    const an = t.closest('[data-ann]');
    if (an) {
      const a = anns().find((x) => x.id === an.dataset.ann);
      return isAdmin() ? openForm({ ...a, forAll: true }) : openDay(a.date);
    }
    const dv = t.closest('[data-devo-day]');
    if (dv) return Devo.openDay(dv.dataset.devoDay);
    const more = t.closest('[data-day]');
    if (more) return openDay(more.dataset.day);
    const num = t.closest('[data-open]');
    if (num) return openDay(num.dataset.open);
    const c = t.closest('[data-cell]');
    if (c) openForm({ date: c.dataset.cell });
  }

  // ---------- janela (novo / editar / resumo do dia) ----------
  let dlg = null;
  let form = null;

  function ensureDlg() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'dlg';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', onDlgClick);
    dlg.addEventListener('input', onDlgInput);
    dlg.addEventListener('change', onDlgInput);
    dlg.addEventListener('submit', onDlgSubmit);
  }
  function show(html) {
    ensureDlg();
    dlg.innerHTML = `<div class="dlg-body">${html}</div>`;
    if (!dlg.open) dlg.showModal();
  }
  const close = () => dlg?.close();
  const closeBtn = `<button type="button" class="icon-btn sm" data-dlg="close" aria-label="Fechar">${icon('x', 18)}</button>`;

  function swatches(sel, extra) {
    return `<div class="swatches" role="group" aria-label="Cor">${Object.entries(COLORS).map(([k, c]) =>
      `<button type="button" class="swatch ${sel === k ? 'sel' : ''}" data-color="${k}" ${extra} aria-pressed="${sel === k}" aria-label="${c.label}" style="--sw:${c.fg}"></button>`).join('')}</div>`;
  }

  function tagBlock() {
    const f = form;
    if (f.manage) {
      return `<div class="tag-manage">${tags().map((t) => `
        <div class="tag-row">
          <input data-rename="${t.id}" value="${esc(t.name)}" maxlength="24" aria-label="Nome da etiqueta" style="${tagStyle(t.id)}" />
          ${swatches(t.color, `data-recolor="${t.id}"`)}
          <button type="button" class="icon-btn sm" data-deltag="${t.id}" aria-label="Excluir etiqueta ${esc(t.name)}">${icon('trash', 16)}</button>
        </div>`).join('') || '<p class="muted">Nenhuma etiqueta ainda.</p>'}</div>`;
    }
    return `
      <div class="tags">
        ${tags().map((t) => `<button type="button" class="tag ${f.tagId === t.id ? 'sel' : ''}" data-tag="${t.id}" aria-pressed="${f.tagId === t.id}" style="${tagStyle(t.id)}">${f.tagId === t.id ? icon('check', 14) : ''}${esc(t.name)}</button>`).join('')}
        <button type="button" class="tag tag-new" data-dlg="newtag" aria-expanded="${f.newTag}">${icon('plus', 14)} nova</button>
      </div>
      ${f.newTag ? `
        <div class="newtag">
          <input name="newName" value="${esc(f.newName)}" placeholder="Nome da etiqueta (ex.: Célula)" maxlength="24" aria-label="Nome da nova etiqueta" />
          ${swatches(f.newColor, 'data-newcolor')}
          <button type="button" class="btn btn-soft btn-sm" data-dlg="createtag">criar etiqueta</button>
        </div>` : ''}`;
  }

  function openForm(src = {}) {
    form = {
      id: src.id || null,
      forAll: !!src.forAll,
      date: src.date || todayKey(),
      time: src.time || '',
      title: src.title || '',
      notes: src.notes || '',
      tagId: src.tagId || null,
      kind: src.kind || 'encontro',
      link: src.link || '',
      keyword: src.id ? (kwOf(src.id)?.word || '') : '',
      manage: false, newTag: false, newName: '', newColor: 'gold',
    };
    drawForm();
    dlg.querySelector('[name="title"]')?.focus();
  }

  function drawForm() {
    const f = form;
    const ann = f.forAll;
    show(`
      <form class="dlg-form" novalidate>
        <div class="dlg-head"><h2>${f.id ? 'Editar' : 'Novo'} ${ann ? 'aviso para todos' : 'compromisso'}</h2>${closeBtn}</div>
        ${isAdmin() && !f.id ? `
          <label class="switch-row">
            <input type="checkbox" name="forAll" ${ann ? 'checked' : ''} />
            <span><strong>Publicar para todos</strong><small>Encontros ao vivo, pedidos de oração e avisos aparecem no calendário de todo mundo.</small></span>
          </label>` : ''}
        <label class="fld">Título<input name="title" value="${esc(f.title)}" maxlength="100" placeholder="${ann ? 'Ex.: Live de estudo em Romanos' : 'Ex.: Estudo com o grupo'}" /></label>
        <div class="row2">
          <label class="fld">Data<input type="date" name="date" value="${f.date}" /></label>
          <label class="fld"><span>Horário <small>(opcional)</small></span><input type="time" name="time" value="${f.time}" /></label>
        </div>
        ${ann ? `
          <label class="fld">Tipo<select name="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
          <label class="fld"><span>Link <small>(opcional, ex.: link da live)</small></span><input type="url" name="link" value="${esc(f.link)}" placeholder="https://" /></label>
          ${f.kind === 'encontro' ? `
            <label class="fld"><span>🔑 Palavra-chave da presença <small>(preencha quando o vídeo subir)</small></span>
              <input name="keyword" value="${esc(f.keyword)}" maxlength="40" autocomplete="off" placeholder="Ex.: graça" /></label>
            <p class="fld-help">Fale ou mostre essa palavra no vídeo. Cada pessoa digita ela aqui no calendário pra confirmar a própria presença, em até 48h depois que você salvar. Maiúsculas e acentos não importam.</p>` : ''}`
        : `<div class="fld">
            <div class="fld-row"><span>Etiqueta</span><button type="button" class="btn-link sm" data-dlg="manage">${f.manage ? 'pronto' : 'editar etiquetas'}</button></div>
            ${tagBlock()}
          </div>`}
        <label class="fld">Observações<textarea name="notes" rows="3" maxlength="1000">${esc(f.notes)}</textarea></label>
        <p class="form-err" id="formErr" role="alert"></p>
        <div class="dlg-foot">
          ${f.id ? `<button type="button" class="btn btn-danger" data-dlg="delete">${icon('trash', 16)} excluir</button>` : ''}
          <span class="spacer"></span>
          <button type="button" class="btn btn-soft" data-dlg="close">cancelar</button>
          <button type="submit" class="btn btn-navy">salvar</button>
        </div>
      </form>`);
  }

  // ---------- presença em encontros (palavra-chave) ----------
  // No multiusuário, a palavra-chave fica numa tabela que só a administração lê,
  // e a conferência é feita no servidor (ver supabase/schema.sql: marcar_presenca).
  const KEY_HOURS = 48; // a palavra-chave vale por 48h depois de publicada
  const keys = () => Store.get('encontroKeys') || {};
  const kwOf = (id) => { const v = keys()[id]; return !v ? null : typeof v === 'string' ? { word: v, at: new Date().toISOString() } : v; };
  const hoursLeft = (kw) => KEY_HOURS - (Date.now() - new Date(kw.at).getTime()) / 3600000;
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

  function attendHtml(a) {
    const went = !!(Store.get('attendance') || {})[a.id];
    const kw = kwOf(a.id);
    const left = kw ? hoursLeft(kw) : 0;
    const adminNote = isAdmin()
      ? `<small class="kw-admin">🔑 ${kw ? `palavra-chave: <b>${esc(kw.word)}</b> · ${left > 0 ? `aberta por mais ${Math.ceil(left)}h` : 'prazo encerrado'}` : 'sem palavra-chave ainda. Edite o aviso quando o vídeo subir'}</small>`
      : '';
    if (went) return `${adminNote}<span class="attend on">✅ presença confirmada</span>`;
    if (!kw) return `${adminNote}<small class="attend-wait">🔑 A presença abre quando o vídeo for publicado com a palavra-chave.</small>`;
    if (left <= 0) return `${adminNote}<small class="attend-wait">⏰ O prazo pra confirmar presença neste encontro (${KEY_HOURS}h) terminou.</small>`;
    return `${adminNote}
      <form class="attend-form" data-attend-form="${a.id}">
        <input name="kw" placeholder="palavra-chave do vídeo" aria-label="Palavra-chave do encontro" autocomplete="off" maxlength="40" />
        <button class="attend" type="submit">confirmar presença</button>
      </form>`;
  }

  function tryAttend(formEl) {
    const id = formEl.dataset.attendForm;
    const input = formEl.querySelector('input');
    const kw = kwOf(id);
    if (!kw) return;
    const wrong = () => {
      input.setAttribute('aria-invalid', 'true');
      toast('Palavra-chave incorreta. Confira no vídeo! 🔎');
      input.select();
    };
    if (hoursLeft(kw) <= 0) { toast('O prazo de presença deste encontro terminou. ⏰'); return; }
    if (Store.isCloud()) {
      // online: quem confere a palavra é o servidor (ninguém vê a palavra pelo navegador)
      const btn = formEl.querySelector('button');
      btn.disabled = true;
      Cloud.attend(id, input.value).then((r) => {
        btn.disabled = false;
        if (r === 'ok') return attended(id);
        if (r === 'errada') return wrong();
        toast(r === 'expirou' ? 'O prazo de presença deste encontro terminou. ⏰' : 'A presença deste encontro ainda não foi aberta.');
      }).catch(() => { btn.disabled = false; toast('⚠️ Sem conexão. Tente de novo.'); });
      return;
    }
    if (norm(input.value) !== norm(kw.word)) return wrong();
    attended(id);
  }

  function attended(id) {
    Store.set('attendance', { ...(Store.get('attendance') || {}), [id]: new Date().toISOString() });
    const ann = anns().find((x) => x.id === id);
    openDay(ann.date);
    if (currentRoute() === 'calendario') refreshContent();
    toast('Presença confirmada! 🙌');
  }

  function openDay(k) {
    form = null;
    const it = itemsOn(k);
    const empty = !it.hol.length && !it.anns.length && !it.devo && !it.evs.length;
    show(`
      <div class="dlg-head"><h2>${longDate(k)}${k === todayKey() ? ' · hoje' : ''}</h2>${closeBtn}</div>
      ${it.hol.length ? `<div class="day-hol">${icon('star', 16)} ${esc(it.hol.join(' · '))}</div>` : ''}
      ${it.anns.map((a) => `
        <div class="day-item ann">
          <span class="day-item-ico">${icon(KINDS[a.kind]?.icon || 'megaphone', 16)}</span>
          <span class="day-item-txt">
            <small>${KINDS[a.kind]?.label || 'Aviso'} · para todos</small>
            <strong>${a.time ? a.time + ' · ' : ''}${esc(a.title)}</strong>
            ${a.notes ? `<span class="d-notes">${esc(a.notes)}</span>` : ''}
            ${safeLink(a.link) ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">${icon('link', 14)} acessar</a>` : ''}
            ${a.kind === 'encontro' ? attendHtml(a) : ''}
          </span>
          ${isAdmin() ? `<button class="icon-btn sm" data-ann-edit="${a.id}" aria-label="Editar aviso">${icon('pencil', 16)}</button>` : ''}
        </div>`).join('')}
      ${it.devo ? `
        <button class="day-item" data-devo-day="${k}">
          <span class="day-item-ico">${icon('bookOpen', 16)}</span>
          <span class="day-item-txt"><small>leitura do devocional</small><strong>${esc(it.devo)}</strong></span>
          ${icon('chevronRight', 16)}
        </button>` : ''}
      ${it.evs.map((ev) => `
        <button class="day-item" data-ev="${ev.id}" style="${tagStyle(ev.tagId)}">
          <span class="day-item-bar"></span>
          <span class="day-item-txt">
            <small>${esc(tagOf(ev.tagId)?.name || 'compromisso')}</small>
            <strong>${ev.time ? ev.time + ' · ' : ''}${esc(ev.title)}</strong>
            ${ev.notes ? `<span class="d-notes">${esc(ev.notes)}</span>` : ''}
          </span>
          ${icon('pencil', 16)}
        </button>`).join('')}
      ${empty ? '<p class="muted day-empty">Nada marcado pra este dia ainda.</p>' : ''}
      <div class="dlg-foot"><span class="spacer"></span><button class="btn btn-navy" data-dlg="newOn" data-date="${k}">${icon('plus', 16)} novo compromisso</button></div>`);
  }

  function afterChange(msg, date) {
    if (date) { const d = dateOf(date); view = { y: d.getFullYear(), m: d.getMonth() }; }
    if (currentRoute() === 'calendario') refreshContent();
    toast(msg);
  }

  function onDlgClick(e) {
    if (e.target === dlg) return close(); // clique fora da janela
    const t = e.target;
    const actionEl = t.closest('[data-dlg]');
    const a = actionEl?.dataset.dlg;
    if (a === 'close') return close();
    if (a === 'newOn') return openForm({ date: actionEl.dataset.date });
    if (form) {
      if (a === 'manage') { form.manage = !form.manage; form.newTag = false; return drawForm(); }
      if (a === 'newtag') { form.newTag = !form.newTag; drawForm(); dlg.querySelector('[name="newName"]')?.focus(); return; }
      if (a === 'createtag') {
        const name = form.newName.trim();
        if (!name) { dlg.querySelector('[name="newName"]')?.focus(); return; }
        const tag = { id: uid(), name, color: form.newColor };
        Store.set('tags', [...tags(), tag]);
        Object.assign(form, { tagId: tag.id, newTag: false, newName: '' });
        return drawForm();
      }
      if (a === 'delete') {
        if (!confirm(form.forAll ? 'Excluir este aviso para todos?' : 'Excluir este compromisso?')) return;
        const key = form.forAll ? 'announcements' : 'events';
        Store.set(key, (Store.get(key) || []).filter((x) => x.id !== form.id));
        if (form.forAll) { const k = keys(); delete k[form.id]; Store.set('encontroKeys', k); }
        close();
        return afterChange('Excluído.');
      }
      const tag = t.closest('[data-tag]');
      if (tag) { form.tagId = form.tagId === tag.dataset.tag ? null : tag.dataset.tag; return drawForm(); }
      const sw = t.closest('[data-color]');
      if (sw) {
        if (sw.dataset.recolor) {
          const ts = tags();
          const x = ts.find((z) => z.id === sw.dataset.recolor);
          if (x) { x.color = sw.dataset.color; Store.set('tags', ts); }
        } else form.newColor = sw.dataset.color;
        return drawForm();
      }
      const del = t.closest('[data-deltag]');
      if (del) {
        const id = del.dataset.deltag;
        const used = events().filter((x) => x.tagId === id).length;
        if (used && !confirm(`Essa etiqueta está em ${used} compromisso(s). Excluir mesmo assim? Eles ficam sem etiqueta.`)) return;
        Store.set('tags', tags().filter((z) => z.id !== id));
        if (form.tagId === id) form.tagId = null;
        return drawForm();
      }
    }
    // itens do resumo do dia
    const ev = t.closest('[data-ev]');
    if (ev) return openForm(events().find((x) => x.id === ev.dataset.ev));
    const an = t.closest('[data-ann-edit]');
    if (an) return openForm({ ...anns().find((x) => x.id === an.dataset.annEdit), forAll: true });
    const dv = t.closest('[data-devo-day]');
    if (dv) { close(); Devo.openDay(dv.dataset.devoDay); }
  }

  function onDlgInput(e) {
    const t = e.target;
    if (!form) return;
    if (t.dataset.rename) {
      if (e.type !== 'input') return;
      const ts = tags();
      const x = ts.find((z) => z.id === t.dataset.rename);
      if (x) { x.name = t.value.trim() || 'sem nome'; Store.set('tags', ts); }
      return;
    }
    if (t.name === 'forAll') {
      if (e.type !== 'change') return;
      form.forAll = t.checked;
      drawForm();
      dlg.querySelector('[name="forAll"]')?.focus();
      return;
    }
    if (t.name === 'kind') {
      form.kind = t.value;
      if (e.type === 'change') { drawForm(); dlg.querySelector('[name="kind"]')?.focus(); }
      return;
    }
    if (t.name && t.name in form) form[t.name] = t.value;
  }

  function onDlgSubmit(e) {
    e.preventDefault();
    const attendForm = e.target.closest('[data-attend-form]');
    if (attendForm) return tryAttend(attendForm);
    if (!form) return;
    const err = (msg, field) => { dlg.querySelector('#formErr').textContent = msg; dlg.querySelector(`[name="${field}"]`)?.focus(); };
    const title = form.title.trim();
    if (!title) return err('Dê um título.', 'title');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return err('Escolha uma data.', 'date');
    if (form.forAll && form.link.trim() && !safeLink(form.link.trim())) return err('O link precisa começar com https://', 'link');
    const base = { id: form.id || uid(), date: form.date, time: form.time, title, notes: form.notes.trim() };
    if (form.forAll) {
      upsert('announcements', { ...base, kind: form.kind, link: form.link.trim() });
      const k = keys();
      const word = form.keyword.trim();
      if (form.kind === 'encontro' && word) {
        const old = kwOf(base.id);
        // o prazo de 48h só recomeça se a palavra mudar
        k[base.id] = old && old.word === word && typeof k[base.id] === 'object' ? k[base.id] : { word, at: new Date().toISOString() };
      } else delete k[base.id];
      Store.set('encontroKeys', k);
    } else upsert('events', { ...base, tagId: form.tagId });
    const msg = form.id ? 'Alterações salvas.' : form.forAll ? 'Aviso publicado para todos.' : 'Compromisso criado.';
    close();
    afterChange(msg, base.date);
  }

  function onEnter() { view = null; }

  return { render, onClick, onEnter, COLORS };
})();

PAGES.calendario = {
  ...PAGES.calendario,
  label: 'Calendário Bíblico',
  sub: 'planeje seu dia, devocionais, estudos, leitura etc. aqui',
  render: Cal.render,
  onClick: Cal.onClick,
  onEnter: Cal.onEnter,
};
