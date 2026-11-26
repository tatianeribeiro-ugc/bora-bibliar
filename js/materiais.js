// Materiais e PDFs: arquivos guardados no Supabase (bucket privado "materiais").
// Só quem está logado lê/baixa; só a administração envia e remove.

const Materials = (() => {
  let list = null;
  let loading = false;
  let err = '';
  let formOpen = false;
  let sending = false;

  const isAdmin = () => Store.get('profile').role === 'admin';
  const sizeTxt = (b) => (b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const dateTxt = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  const fileName = (m) => m.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w -]+/g, '').trim() + '.pdf';

  function card(m) {
    return `<div class="card mat">
      <span class="mat-ico" aria-hidden="true">${icon('fileText', 26)}</span>
      <div class="mat-txt">
        <strong>${esc(m.title)}</strong>
        ${m.description ? `<p>${esc(m.description)}</p>` : ''}
        <small>PDF · ${sizeTxt(m.size || 0)} · ${dateTxt(m.created_at)}</small>
      </div>
      <div class="mat-act">
        <button class="btn btn-navy btn-sm" data-mat-read="${esc(m.id)}">${icon('bookOpen', 15)} ler</button>
        <button class="btn btn-soft btn-sm" data-mat-down="${esc(m.id)}">${icon('download', 15)} baixar</button>
        ${isAdmin() ? `<button class="btn-link sm" data-mat-del="${esc(m.id)}">remover</button>` : ''}
      </div>
    </div>`;
  }

  function adminForm() {
    if (!isAdmin()) return '';
    if (!formOpen) return `<button class="btn btn-soft" data-mat-open>${icon('plus', 16)} adicionar material</button>`;
    return `<form class="card form mat-form" data-mat-form>
      <h3 class="mat-form-title">Novo material</h3>
      <label>Título<input name="title" maxlength="90" placeholder="Ex.: Guia: meu devocional" required /></label>
      <label>Descrição <small class="muted">(opcional)</small><textarea name="description" rows="2" maxlength="280" placeholder="Uma frase sobre o material"></textarea></label>
      <label>Arquivo PDF<input name="file" type="file" accept="application/pdf,.pdf" required /></label>
      <p class="form-err" role="alert">${esc(err)}</p>
      <div class="actions">
        <button class="btn btn-navy" type="submit" ${sending ? 'disabled' : ''}>${sending ? 'enviando…' : 'publicar material'}</button>
        <button class="btn btn-link" type="button" data-mat-cancel>cancelar</button>
      </div>
    </form>`;
  }

  function render() {
    if (!Store.isCloud()) {
      return `<div class="card soon2"><span class="soon2-emoji" aria-hidden="true">📂</span>
        <h2 class="soon2-title">Entre com a sua conta</h2>
        <p class="soon2-text">Os materiais ficam guardados na nuvem do Bora Bibliar e aparecem aqui quando você entra com o seu e-mail e senha.</p></div>`;
    }
    const body = list === null
      ? '<p class="muted">carregando materiais…</p>'
      : list.length ? `<div class="mats">${list.map(card).join('')}</div>`
        : '<div class="card"><p class="muted" style="margin:0">Nenhum material publicado ainda.</p></div>';
    return `
      <p class="gm-intro">Materiais complementares às aulas do Plano de Estudos e estudos bíblicos escritos. Leia direto no app ou baixe o PDF. <strong>Novos materiais chegam por aqui!</strong></p>
      ${body}
      ${!formOpen && err ? `<p class="form-err" role="alert">${esc(err)}</p>` : ''}
      <div class="mat-admin">${adminForm()}</div>`;
  }

  async function load() {
    loading = true;
    try { list = await Cloud.materials(); err = ''; } catch (e) { list = list || []; err = 'Não consegui carregar os materiais. Confira a internet.'; }
    loading = false;
    if (location.hash.startsWith('#/materiais')) refreshContent();
  }

  function afterRender() {
    if (Store.isCloud() && list === null && !loading) load();
  }

  async function open(m, download) {
    // abre a aba antes do "await" pra o navegador não bloquear como pop-up
    const w = download ? null : window.open('', '_blank');
    try {
      const url = await Cloud.materialUrl(m.path, download ? fileName(m) : null);
      if (w) w.location.href = url; else location.href = url;
    } catch (e) {
      w?.close();
      toast('⚠️ Não consegui abrir o material. Tente de novo.');
    }
  }

  function onClick(e) {
    const t = e.target;
    const find = (id) => (list || []).find((m) => m.id === id);
    const r = t.closest('[data-mat-read]');
    if (r) return open(find(r.dataset.matRead), false);
    const d = t.closest('[data-mat-down]');
    if (d) return open(find(d.dataset.matDown), true);
    if (t.closest('[data-mat-open]')) { formOpen = true; err = ''; refreshContent(); document.querySelector('[data-mat-form] input')?.focus(); return; }
    if (t.closest('[data-mat-cancel]')) { formOpen = false; err = ''; refreshContent(); return; }
    const x = t.closest('[data-mat-del]');
    if (x) {
      const m = find(x.dataset.matDel);
      if (!m || !confirm(`Remover “${m.title}”? O arquivo sai do Hub pra todo mundo.`)) return;
      Cloud.removeMaterial(m).then(() => { toast('Material removido.'); load(); })
        .catch(() => toast('⚠️ Não consegui remover. Tente de novo.'));
    }
  }

  function onSubmit(e) {
    const f = e.target.closest('[data-mat-form]');
    if (!f) return;
    e.preventDefault();
    const title = f.elements.title.value.trim();
    const description = f.elements.description.value.trim();
    const file = f.elements.file.files[0];
    const fail = (msg) => { err = msg; f.querySelector('.form-err').textContent = msg; };
    if (!title) return fail('Dê um título ao material.');
    if (!file) return fail('Escolha o arquivo PDF.');
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return fail('Por enquanto, só arquivos PDF.');
    if (file.size > 50 * 1048576) return fail('O arquivo passa de 50 MB. Tente um PDF menor.');
    sending = true;
    f.querySelector('[type="submit"]').disabled = true;
    f.querySelector('[type="submit"]').textContent = 'enviando…';
    Cloud.addMaterial(file, { title, description })
      .then(async () => { sending = false; formOpen = false; err = ''; toast('Material publicado! 📚'); await load(); })
      .catch(() => { sending = false; fail('Não consegui enviar. Confira a internet e tente de novo.'); const b = f.querySelector('[type="submit"]'); if (b) { b.disabled = false; b.textContent = 'publicar material'; } });
  }

  return { render, afterRender, onClick, onSubmit };
})();

PAGES.materiais = {
  ...PAGES.materiais,
  sub: 'materiais complementares e estudos escritos',
  render: Materials.render,
  afterRender: Materials.afterRender,
  onClick: Materials.onClick,
  onSubmit: Materials.onSubmit,
};
