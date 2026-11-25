// Comunidade: link do grupo de WhatsApp + mural de pedidos de oração + mural de testemunhos.
// Cada pessoa publica com o nome ou de forma anônima. Todos veem, oram e celebram juntos.
// Dados: Store 'wall' (publicações), 'wallReacts' (em quais eu orei / celebrei).

const Community = (() => {
  // O link do grupo fica no banco (tabela settings), só aparece pra quem está logado.
  const whatsapp = () => { const u = (Store.get('settings') || {}).whatsapp || ''; return /^https:\/\//i.test(u) ? u : ''; };
  const ANON = 'Alguém da comunidade';
  const MURALS = {
    oracao: {
      title: '🙏 Pedidos de oração', lead: 'Compartilhe seu pedido. Toda a comunidade vê e ora com você.',
      ph: 'Pelo que você quer que a gente ore?', send: 'pedir oração', react: 'vou orar', reactOn: 'orando com você',
      emoji: '🙏', empty: 'Nenhum pedido ainda. Se precisar, é só escrever: a gente ora junto. 💛',
    },
    testemunho: {
      title: '✨ Testemunhos', lead: 'Conte o que Deus fez! Seu testemunho fortalece a fé de alguém.',
      ph: 'O que Deus fez na sua vida?', send: 'publicar testemunho', react: 'glória a Deus', reactOn: 'glória a Deus',
      emoji: '🙌', empty: 'Nenhum testemunho ainda. Que tal ser a primeira pessoa a contar? ✨',
    },
  };

  const posts = () => Store.get('wall') || [];
  const reacts = () => Store.get('wallReacts') || {};
  const isAdmin = () => (Store.get('profile').role || 'admin') === 'admin';
  const myName = () => (Store.get('profile').name || '').trim();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const when = (iso) => {
    const d = new Date(iso), now = new Date();
    const mins = Math.round((now - d) / 60000);
    if (mins < 1) return 'agora mesmo';
    if (mins < 60) return `há ${mins} min`;
    if (mins < 60 * 24) return `há ${Math.round(mins / 60)} h`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  function postHtml(p) {
    const m = MURALS[p.kind];
    const on = !!reacts()[p.id];
    const count = (p.reacts || 0) + (on ? 1 : 0);
    const author = p.anon ? ANON : (p.author || 'Sem nome');
    return `<article class="post ${p.answered ? 'answered' : ''}">
      <header class="post-head">
        <span class="avatar sm ${p.anon ? 'anon' : ''}" aria-hidden="true">${p.anon ? '🕊️' : esc(author.charAt(0).toUpperCase())}</span>
        <span><strong>${esc(author)}</strong><small>${when(p.at)}${p.mine && p.anon ? ' · só você sabe que foi você' : ''}</small></span>
        ${p.answered ? '<span class="answered-badge">✨ oração respondida</span>' : ''}
      </header>
      <p class="post-text">${esc(p.text)}</p>
      <footer class="post-foot">
        <button class="react ${on ? 'on' : ''}" data-react="${p.id}" aria-pressed="${on}">
          ${m.emoji} ${on ? m.reactOn : m.react}${count ? ` <b>${count}</b>` : ''}
        </button>
        <span class="post-own">
          ${p.mine && p.kind === 'oracao' ? `<button class="btn-link sm" data-answer="${p.id}">${p.answered ? 'desmarcar respondida' : 'Deus respondeu! 🎉'}</button>` : ''}
          ${p.mine || isAdmin() ? `<button class="btn-link sm" data-del-post="${p.id}">excluir</button>` : ''}
        </span>
      </footer>
    </article>`;
  }

  function muralHtml(kind) {
    const m = MURALS[kind];
    const list = posts().filter((p) => p.kind === kind).sort((a, b) => b.at.localeCompare(a.at));
    const name = myName();
    return `<section class="mural mural-${kind}" aria-labelledby="mural-${kind}">
      <form class="card post-form" data-post-form="${kind}">
        <h2 class="section-title" id="mural-${kind}">${m.title}</h2>
        <p class="muted">${m.lead}</p>
        <label class="fld"><span class="sr-only">${m.ph}</span>
          <textarea name="text" rows="3" maxlength="1000" placeholder="${m.ph}"></textarea></label>
        <label class="switch-row anon-row">
          <input type="checkbox" name="anon" />
          <span><strong>Publicar sem meu nome</strong>
          <small>Seu nome e sua foto ficam ocultos (aparece “${ANON}”), mas ${kind === 'oracao' ? 'seu pedido chega a toda a comunidade, que vai orar com você' : 'seu testemunho chega a toda a comunidade'}.</small></span>
        </label>
        ${name ? '' : '<p class="fld-help">Dica: coloque seu nome em <a href="#/perfil">Meu perfil</a> pra ele aparecer nas publicações.</p>'}
        <p class="form-err" role="alert"></p>
        <button class="btn ${kind === 'oracao' ? 'btn-navy' : 'btn-gold'}" type="submit">${m.send}</button>
      </form>
      <div class="post-list">${list.map(postHtml).join('') || `<p class="muted post-empty">${m.empty}</p>`}</div>
    </section>`;
  }

  function render() {
    const wa = whatsapp();
    const waEdit = isAdmin() ? `<button class="btn-link sm wa-edit" data-wa-edit>${wa ? 'trocar link do grupo' : '+ colocar link do grupo do WhatsApp'}</button>` : '';
    if (!wa) return `${waEdit}<div class="murals">${muralHtml('oracao')}${muralHtml('testemunho')}</div>`;
    return `
      <a class="card wa-card" href="${esc(wa)}" target="_blank" rel="noopener">
        <span class="wa-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg></span>
        <span class="wa-txt"><strong>Grupo do Bora Bibliar no WhatsApp</strong>
          <small>Avisos, lembretes dos encontros e conversa com a comunidade.</small></span>
        <span class="btn wa-btn">entrar no grupo ${icon('arrowRight', 16)}</span>
      </a>${waEdit}
      <div class="murals">${muralHtml('oracao')}${muralHtml('testemunho')}</div>`;
  }

  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-wa-edit]')) {
      const u = prompt('Cole o link de convite do grupo do WhatsApp (começa com https://chat.whatsapp.com/):', whatsapp());
      if (u === null) return;
      if (u.trim() && !/^https:\/\//i.test(u.trim())) { toast('O link precisa começar com https://'); return; }
      Store.set('settings', { ...(Store.get('settings') || {}), whatsapp: u.trim() });
      refreshContent();
      toast(u.trim() ? 'Link do grupo atualizado. 💬' : 'Link do grupo removido.');
      return;
    }
    const r = t.closest('[data-react]');
    if (r) {
      const map = reacts();
      const id = r.dataset.react;
      if (map[id]) delete map[id]; else map[id] = new Date().toISOString();
      Store.set('wallReacts', map);
      const p = posts().find((x) => x.id === id);
      refreshContent();
      document.querySelector(`[data-react="${id}"]`)?.focus();
      if (map[id] && p?.kind === 'oracao') toast('🙏 Que bom que você orou! Deus ouve.');
      return;
    }
    const a = t.closest('[data-answer]');
    if (a) {
      const list = posts();
      const p = list.find((x) => x.id === a.dataset.answer);
      p.answered = !p.answered;
      Store.set('wall', list);
      refreshContent();
      if (p.answered) toast('🎉 Glória a Deus! Que tal contar no mural de testemunhos?');
      return;
    }
    const d = t.closest('[data-del-post]');
    if (d) {
      if (!confirm('Excluir esta publicação?')) return;
      Store.set('wall', posts().filter((x) => x.id !== d.dataset.delPost));
      refreshContent();
      toast('Publicação excluída.');
    }
  }

  function onSubmit(e) {
    const f = e.target.closest('[data-post-form]');
    if (!f) return;
    e.preventDefault();
    const kind = f.dataset.postForm;
    const text = f.elements.text.value.trim();
    if (text.length < 5) { f.querySelector('.form-err').textContent = 'Escreva um pouquinho mais.'; f.elements.text.focus(); return; }
    const anon = f.elements.anon.checked;
    // anônimo: o nome nem é guardado na publicação
    Store.set('wall', [...posts(), { id: uid(), kind, text, anon, author: anon ? '' : myName(), at: new Date().toISOString(), mine: true }]);
    refreshContent();
    toast(kind === 'oracao' ? '🙏 Pedido publicado. A comunidade vai orar com você!' : '✨ Testemunho publicado. Glória a Deus!');
  }

  return { render, onClick, onSubmit };
})();

PAGES.comunidade = {
  ...PAGES.comunidade,
  sub: 'orar, celebrar e caminhar junto',
  render: Community.render,
  onClick: Community.onClick,
  onSubmit: Community.onSubmit,
};
