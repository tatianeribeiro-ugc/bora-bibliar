// Biblioteca: estante de livros (catálogo da administração, cada livro abre o PDF no Drive),
// minha leitura (status + nota, pessoal) e resenhas públicas.
// Dados: Store 'books' (catálogo, só admin edita), 'reading' (pessoal), 'reviews' e 'reviewLikes'.

const Library = (() => {
  const SPINES = {
    navy: { bg: '#4F3F84', fg: '#FFFFFF', label: 'roxo' },
    gold: { bg: '#FFA22A', fg: '#2A2340', label: 'âmbar' },
    wine: { bg: '#8A2A40', fg: '#FFFFFF', label: 'vinho' },
    green: { bg: '#82AC26', fg: '#2A2340', label: 'verde' },
    teal: { bg: '#1F5B63', fg: '#FFFFFF', label: 'turquesa' },
    purple: { bg: '#A08FD6', fg: '#2A2340', label: 'lavanda' },
    terracotta: { bg: '#FF662A', fg: '#2A2340', label: 'laranja' },
    cream: { bg: '#FFF0D6', fg: '#4F3F84', label: 'creme' },
  };
  const STATUS = { quero: 'quero ler', lendo: 'lendo', concluido: 'concluído' };

  const books = () => Store.get('books') || [];
  const reading = () => Store.get('reading') || {};
  const reviews = () => Store.get('reviews') || [];
  const likes = () => Store.get('reviewLikes') || {};
  const isAdmin = () => (Store.get('profile').role || 'admin') === 'admin';
  const bookOf = (id) => books().find((b) => b.id === id);
  const spineOf = (b) => SPINES[b?.color] || SPINES.navy;
  const safeLink = (u) => /^https?:\/\//i.test(u || '');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const heightOf = (id) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 200 + (h % 36); };
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ', ' + new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let tab = 'estante';
  let editMode = false;

  // ---------- leitura pessoal ----------
  function setStatus(id, status) {
    const r = reading();
    const prev = r[id]?.status;
    if (prev === status) return;
    r[id] = { ...r[id], status, at: new Date().toISOString() };
    if (status !== 'concluido') delete r[id].rating;
    Store.set('reading', r);
    // XP por livro concluído
    const xp = Store.get('xp').filter((x) => !(x.action === 'livro' && x.ref === id));
    if (status === 'concluido') xp.push({ at: new Date().toISOString(), action: 'livro', ref: id, points: XP_RULES.livro });
    Store.set('xp', xp);
    if (status === 'concluido') toast(`📚 Livro concluído! +${XP_RULES.livro} XP`);
  }
  function clearStatus(id) {
    const r = reading();
    delete r[id];
    Store.set('reading', r);
    Store.set('xp', Store.get('xp').filter((x) => !(x.action === 'livro' && x.ref === id)));
  }
  const booksRead = () => Object.entries(reading()).filter(([id, v]) => v.status === 'concluido' && bookOf(id)).length;

  // ---------- abas ----------
  function tabs() {
    const t = [['estante', '📚 biblioteca'], ['leitura', '✍️ minha leitura'], ['resenhas', '⭐ resenhas públicas']];
    return `<div class="tabs" role="tablist">${t.map(([k, label]) =>
      `<button class="tab ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-tab="${k}">${label}</button>`).join('')}</div>`;
  }

  function shelfHtml() {
    const list = books();
    const r = reading();
    const adminBar = isAdmin() ? `
      <div class="shelf-admin">
        <button class="btn btn-navy btn-sm" data-lib="add">${icon('plus', 16)} adicionar livro</button>
        ${list.length ? `<button class="btn btn-soft btn-sm" data-lib="edit" aria-pressed="${editMode}">${icon('pencil', 15)} ${editMode ? 'pronto' : 'editar estante'}</button>` : ''}
      </div>` : '';
    if (!list.length) {
      return `${adminBar}<div class="card shelf-card"><div class="shelf-empty">
        <span aria-hidden="true">📚</span><strong>A estante está esperando os primeiros livros.</strong>
        <small>${isAdmin() ? 'Clique em “adicionar livro” e cole o link do PDF no Drive.' : 'Em breve teremos livros por aqui!'}</small>
      </div></div>`;
    }
    return `${adminBar}
      <div class="card shelf-card ${editMode ? 'editing' : ''}">
        <div class="shelf">
          ${list.map((b) => {
            const c = spineOf(b);
            const st = r[b.id]?.status;
            return `<div class="spine-slot"><button class="spine" data-spine="${b.id}"
                style="--bg:${c.bg};--fg:${c.fg};--h:${heightOf(b.id)}px"
                title="${esc(b.title)}${b.author ? ' — ' + esc(b.author) : ''}"
                aria-label="${editMode ? 'Editar' : 'Abrir'} ${esc(b.title)}${b.author ? ', de ' + esc(b.author) : ''}">
              ${st === 'concluido' ? '<span class="spine-flag" aria-hidden="true">✓</span>' : st === 'lendo' ? '<span class="spine-flag reading" aria-hidden="true"></span>' : ''}
              <span class="spine-txt${b.title.length > 24 ? ' long' : ''}"><strong>${esc(b.title)}</strong><small>${esc(b.author || '')}</small></span>
            </button></div>`;
          }).join('')}
        </div>
        <p class="shelf-hint">${editMode ? '✏️ toque num livro pra editar' : 'toque numa lombada pra abrir o livro 👆'}</p>
      </div>`;
  }

  function stars(id, rating, interactive) {
    return `<span class="stars" ${interactive ? 'role="group" aria-label="Sua nota"' : ''}>${[1, 2, 3, 4, 5].map((n) => interactive
      ? `<button class="star ${n <= (rating || 0) ? 'on' : ''}" data-rate="${id}:${n}" aria-label="${n} estrela${n > 1 ? 's' : ''}" aria-pressed="${n <= (rating || 0)}">★</button>`
      : `<span class="star ${n <= (rating || 0) ? 'on' : ''}" aria-hidden="true">★</span>`).join('')}</span>`;
  }

  function readingHtml() {
    const r = reading();
    const vals = Object.entries(r).filter(([id]) => bookOf(id));
    const lendo = vals.filter(([, v]) => v.status === 'lendo').length;
    const rated = vals.filter(([, v]) => v.rating);
    const avg = rated.length ? (rated.reduce((s, [, v]) => s + v.rating, 0) / rated.length).toFixed(1).replace('.', ',') : '—';
    const list = books();
    return `
      <div class="stats lib-stats">
        <div class="stat"><span class="stat-ico">📖</span><strong>${lendo}</strong><small>lendo agora</small></div>
        <div class="stat"><span class="stat-ico">✅</span><strong>${booksRead()}</strong><small>concluídos</small></div>
        <div class="stat"><span class="stat-ico">⭐</span><strong>${avg}</strong><small>sua nota média</small></div>
      </div>
      ${list.length ? `<div class="card read-list">${list.map((b) => {
        const v = r[b.id] || {};
        const c = spineOf(b);
        return `<div class="read-row">
          <span class="read-cover" style="--bg:${c.bg}"></span>
          <span class="read-info"><strong>${esc(b.title)}</strong><small>${esc(b.author || '')}</small></span>
          <span class="seg" role="group" aria-label="Status de ${esc(b.title)}">
            ${Object.entries(STATUS).map(([k, label]) => `<button class="seg-btn ${v.status === k ? 'on' : ''}" data-status="${b.id}:${k}" aria-pressed="${v.status === k}">${label}</button>`).join('')}
          </span>
          <span class="read-rate">${v.status === 'concluido' ? stars(b.id, v.rating, true) : ''}</span>
        </div>`;
      }).join('')}</div>` : '<p class="muted">Quando a estante tiver livros, você acompanha sua leitura aqui.</p>'}`;
  }

  function reviewsHtml() {
    const list = books();
    const me = (Store.get('profile').name || '').trim() || 'Você';
    const lk = likes();
    const all = reviews().slice().sort((a, b) => b.at.localeCompare(a.at));
    return `
      <form class="card review-form" data-review-form>
        <h3>⭐ publique sua resenha</h3>
        <p class="muted">Conte o que você achou do livro. A resenha fica pública: todas as pessoas do hub podem ler e curtir.</p>
        ${list.length ? `
          <label class="fld">Sobre qual livro?
            <select name="book">${list.map((b) => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select>
          </label>
          <label class="fld"><span class="sr-only">Sua resenha</span>
            <textarea name="text" rows="3" maxlength="2000" placeholder="O que você achou? O que mais te marcou, pra quem você indica, vale a pena?"></textarea>
          </label>
          <p class="form-err" role="alert"></p>
          <button class="btn btn-navy" type="submit">publicar resenha</button>`
        : '<p class="muted">Assim que a estante tiver livros, dá pra publicar resenhas.</p>'}
      </form>
      ${all.map((rv) => {
        const b = bookOf(rv.bookId);
        const mine = rv.mine;
        const rating = mine ? reading()[rv.bookId]?.rating : rv.rating;
        return `<article class="card review">
          <header class="review-head">
            <span class="avatar sm">${esc((rv.author || '?').charAt(0).toUpperCase())}</span>
            <span><strong>${esc(rv.author || me)}</strong><small>${fmtDate(rv.at)}</small></span>
            ${rating ? stars(rv.bookId, rating, false) : ''}
          </header>
          <span class="book-chip">📖 ${esc(b?.title || 'livro removido')}</span>
          <p class="review-text">${esc(rv.text)}</p>
          <footer class="review-foot">
            <button class="like ${lk[rv.id] ? 'on' : ''}" data-like="${rv.id}" aria-pressed="${!!lk[rv.id]}" aria-label="Curtir">${lk[rv.id] ? '💜' : '🤍'} ${(rv.likes || 0) + (lk[rv.id] ? 1 : 0)}</button>
            ${mine || isAdmin() ? `<button class="btn-link sm" data-del-review="${rv.id}">excluir</button>` : ''}
          </footer>
        </article>`;
      }).join('') || '<p class="muted review-empty">Nenhuma resenha ainda. Que tal ser a primeira pessoa? 💬</p>'}`;
  }

  function render() {
    const body = tab === 'leitura' ? readingHtml() : tab === 'resenhas' ? reviewsHtml() : shelfHtml();
    return `${tabs()}<div class="tab-body">${body}</div>`;
  }

  // ---------- janela do livro (admin) ----------
  let dlg = null, form = null;
  function ensureDlg() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'dlg';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) return dlg.close();
      const a = e.target.closest('[data-bdlg]')?.dataset.bdlg;
      if (a === 'close') return dlg.close();
      const sw = e.target.closest('[data-bcolor]');
      if (sw) { syncForm(); form.color = sw.dataset.bcolor; return drawForm(); }
      if (a === 'delete') {
        if (!confirm(`Tirar “${form.title}” da estante?`)) return;
        Store.set('books', books().filter((b) => b.id !== form.id));
        dlg.close(); refreshContent(); toast('Livro removido da estante.');
      }
    });
    dlg.addEventListener('submit', (e) => { e.preventDefault(); saveBook(); });
  }
  function syncForm() {
    const f = dlg.querySelector('form');
    if (!f) return;
    ['title', 'author', 'link'].forEach((n) => { form[n] = f.elements[n].value; });
  }
  function openForm(b) {
    form = { id: b?.id || null, title: b?.title || '', author: b?.author || '', link: b?.link || '', color: b?.color || 'navy' };
    ensureDlg();
    drawForm();
    if (!dlg.open) dlg.showModal();
    dlg.querySelector('[name="title"]').focus();
  }
  function drawForm() {
    const f = form;
    dlg.innerHTML = `<div class="dlg-body"><form class="dlg-form" novalidate>
      <div class="dlg-head"><h2>${f.id ? 'Editar livro' : 'Novo livro na estante'}</h2>
        <button type="button" class="icon-btn sm" data-bdlg="close" aria-label="Fechar">${icon('x', 18)}</button></div>
      <label class="fld">Título<input name="title" value="${esc(f.title)}" maxlength="80" placeholder="Ex.: O Peregrino" /></label>
      <label class="fld">Autor(a)<input name="author" value="${esc(f.author)}" maxlength="60" placeholder="Ex.: John Bunyan" /></label>
      <label class="fld"><span>Link do PDF no Drive <small>(pode colocar depois)</small></span>
        <input type="url" name="link" value="${esc(f.link)}" placeholder="https://drive.google.com/..." /></label>
      <p class="fld-help">No Drive: botão direito no PDF → Compartilhar → “Qualquer pessoa com o link” → Copiar link.</p>
      <div class="fld"><span>Cor da lombada</span>
        <div class="swatches big">${Object.entries(SPINES).map(([k, c]) =>
          `<button type="button" class="swatch ${f.color === k ? 'sel' : ''}" data-bcolor="${k}" aria-pressed="${f.color === k}" aria-label="${c.label}" style="--sw:${c.bg}"></button>`).join('')}</div>
      </div>
      <p class="form-err" role="alert"></p>
      <div class="dlg-foot">
        ${f.id ? `<button type="button" class="btn btn-danger" data-bdlg="delete">${icon('trash', 16)} tirar da estante</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn-soft" data-bdlg="close">cancelar</button>
        <button type="submit" class="btn btn-navy">salvar</button>
      </div>
    </form></div>`;
  }
  function saveBook() {
    syncForm();
    const err = (m, n) => { dlg.querySelector('.form-err').textContent = m; dlg.querySelector(`[name="${n}"]`)?.focus(); };
    const title = form.title.trim();
    if (!title) return err('Dê o título do livro.', 'title');
    const link = form.link.trim();
    if (link && !safeLink(link)) return err('O link precisa começar com https://', 'link');
    const item = { id: form.id || uid(), title, author: form.author.trim(), link, color: form.color };
    const list = books();
    const i = list.findIndex((b) => b.id === item.id);
    if (i >= 0) list[i] = item; else list.push(item);
    Store.set('books', list);
    dlg.close();
    refreshContent();
    toast(form.id ? 'Livro atualizado.' : 'Livro colocado na estante! 📚');
  }

  // ---------- cliques ----------
  function onClick(e) {
    const t = e.target;
    const tb = t.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; editMode = false; refreshContent(); document.querySelector(`[data-tab="${tab}"]`)?.focus(); return; }
    const a = t.closest('[data-lib]')?.dataset.lib;
    if (a === 'add') return openForm(null);
    if (a === 'edit') { editMode = !editMode; refreshContent(); document.querySelector('[data-lib="edit"]')?.focus(); return; }

    const sp = t.closest('[data-spine]');
    if (sp) {
      const b = bookOf(sp.dataset.spine);
      if (editMode) return openForm(b);
      if (!safeLink(b.link)) { toast('O PDF deste livro chega em breve! 📚'); return; }
      window.open(b.link, '_blank', 'noopener');
      if (!reading()[b.id]) { setStatus(b.id, 'lendo'); refreshContent(); toast('Boa leitura! Marcamos como “lendo” 📖'); }
      return;
    }
    const st = t.closest('[data-status]');
    if (st) {
      const [id, status] = st.dataset.status.split(':');
      if (reading()[id]?.status === status) clearStatus(id); else setStatus(id, status);
      refreshContent();
      document.querySelector(`[data-status="${id}:${status}"]`)?.focus();
      return;
    }
    const rt = t.closest('[data-rate]');
    if (rt) {
      const [id, n] = rt.dataset.rate.split(':');
      const r = reading();
      r[id] = { ...r[id], rating: +n };
      Store.set('reading', r);
      refreshContent();
      document.querySelector(`[data-rate="${id}:${n}"]`)?.focus();
      return;
    }
    const lk = t.closest('[data-like]');
    if (lk) {
      const map = likes();
      if (map[lk.dataset.like]) delete map[lk.dataset.like]; else map[lk.dataset.like] = true;
      Store.set('reviewLikes', map);
      refreshContent();
      document.querySelector(`[data-like="${lk.dataset.like}"]`)?.focus();
      return;
    }
    const del = t.closest('[data-del-review]');
    if (del) {
      if (!confirm('Excluir esta resenha?')) return;
      Store.set('reviews', reviews().filter((r) => r.id !== del.dataset.delReview));
      refreshContent();
      toast('Resenha excluída.');
    }
  }

  function onSubmit(e) {
    const f = e.target.closest('[data-review-form]');
    if (!f) return;
    e.preventDefault();
    const text = f.elements.text.value.trim();
    if (text.length < 10) { f.querySelector('.form-err').textContent = 'Escreva pelo menos uma frase.'; f.elements.text.focus(); return; }
    const author = (Store.get('profile').name || '').trim() || 'Você';
    Store.set('reviews', [...reviews(), { id: uid(), bookId: f.elements.book.value, text, at: new Date().toISOString(), author, mine: true }]);
    refreshContent();
    toast('Resenha publicada! 💬');
  }

  return { render, onClick, onSubmit, booksRead };
})();

PAGES.biblioteca = {
  ...PAGES.biblioteca,
  sub: 'leituras que fortalecem sua fé',
  render: Library.render,
  onClick: Library.onClick,
  onSubmit: Library.onSubmit,
};
