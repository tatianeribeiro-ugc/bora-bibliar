// Membros liberados (só administração, só online): quem pode criar conta no Bora Bibliar.
// Fluxo: a administração libera o e-mail → manda o convite → a pessoa faz o "primeiro acesso" e cria a senha.

const Members = (() => {
  let list = null;
  let loading = false;
  let err = '';
  const appUrl = () => location.origin + location.pathname;
  const invite = (email) => `Oi! Seu acesso ao Bora Bibliar foi liberado 🙌📖

1. Entre em ${appUrl()}
2. Clique em "primeiro acesso"
3. Use este e-mail: ${email}
4. Crie sua senha e pronto!

Bora bibliar! 💛`;

  function html() {
    const rows = (list || []).map((m) => `
      <div class="member">
        <span class="avatar sm ${m.cadastrado ? '' : 'anon'}" aria-hidden="true">${m.cadastrado ? esc((m.nome || m.email).charAt(0).toUpperCase()) : '✉️'}</span>
        <span class="member-txt"><strong>${esc(m.nome || m.email)}</strong>
          <small>${m.nome ? esc(m.email) + ' · ' : ''}${m.admin ? 'administração · ' : ''}${m.cadastrado ? '✓ já criou a conta' : '⏳ ainda não criou a conta'}</small></span>
        <span class="member-act">
          ${m.cadastrado ? '' : `<button class="btn btn-soft btn-sm" data-m-wa="${esc(m.email)}">enviar pelo WhatsApp</button>
          <button class="btn-link sm" data-m-copy="${esc(m.email)}">copiar convite</button>`}
          ${m.admin ? '' : `<button class="btn-link sm" data-m-del="${esc(m.email)}">remover</button>`}
        </span>
      </div>`).join('');
    return `<h3 class="section-title">membros liberados</h3>
      <div class="card members">
        <p class="muted">Só quem tem o e-mail nesta lista consegue criar a conta. Libere o e-mail, mande o convite e a pessoa cria a própria senha.</p>
        <form class="member-add" data-member-form novalidate>
          <label class="fld"><span class="sr-only">E-mail para liberar</span>
            <input name="email" type="email" placeholder="email@daPessoa.com" autocomplete="off" /></label>
          <button class="btn btn-navy" type="submit">${icon('plus', 16)} liberar acesso</button>
        </form>
        <p class="form-err" role="alert">${esc(err)}</p>
        ${list === null ? '<p class="muted">carregando…</p>' : rows || '<p class="muted">Nenhum e-mail liberado ainda.</p>'}
        ${list && list.length ? `<p class="fld-help">${list.filter((m) => m.cadastrado).length} de ${list.length} já criaram a conta. “Remover” impede novos cadastros com o e-mail; pra tirar o acesso de quem já tem conta, apague a pessoa no painel do Supabase (Authentication → Users).</p>` : ''}
      </div>`;
  }

  const paint = () => { const box = document.getElementById('membersBox'); if (box) box.innerHTML = html(); };
  async function load() {
    loading = true;
    try { list = await Cloud.members(); err = ''; } catch (e) { list = list || []; err = 'Não consegui carregar a lista. Confira a internet.'; }
    loading = false;
    paint();
  }

  function afterRender() {
    if (!document.getElementById('membersBox')) return;
    paint();
    if (!loading) load();
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Convite copiado! Cole no WhatsApp ou no e-mail. 📋'); }
    catch (e) { prompt('Copie o convite:', text); }
  }

  function onClick(e) {
    const t = e.target;
    const c = t.closest('[data-m-copy]');
    if (c) return copy(invite(c.dataset.mCopy));
    const w = t.closest('[data-m-wa]');
    if (w) return window.open('https://wa.me/?text=' + encodeURIComponent(invite(w.dataset.mWa)), '_blank', 'noopener');
    const d = t.closest('[data-m-del]');
    if (d) {
      if (!confirm(`Remover ${d.dataset.mDel} da lista de liberados?`)) return;
      Cloud.disallow(d.dataset.mDel).then(() => { toast('E-mail removido da lista.'); load(); })
        .catch(() => toast('⚠️ Não consegui remover. Tente de novo.'));
    }
  }

  function onSubmit(e) {
    const f = e.target.closest('[data-member-form]');
    if (!f) return;
    e.preventDefault();
    const email = f.elements.email.value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { err = 'Digite um e-mail válido.'; paint(); document.querySelector('[data-member-form] input')?.focus(); return; }
    if ((list || []).some((m) => m.email === email)) { err = 'Esse e-mail já está liberado.'; paint(); return; }
    Cloud.allow(email).then(async () => {
      err = '';
      await load();
      toast('Acesso liberado! Agora é só mandar o convite. 💌');
    }).catch(() => { err = 'Não consegui liberar. Confira a internet.'; paint(); });
  }

  return { afterRender, onClick, onSubmit };
})();

PAGES.configuracoes = { ...PAGES.configuracoes, afterRender: Members.afterRender, onClick: Members.onClick, onSubmit: Members.onSubmit };
