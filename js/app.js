// Ao publicar uma nova versão: aumente APP_VERSION aqui E a constante VERSION em sw.js.
const APP_VERSION = '0.12.0';

const $ = (sel) => document.querySelector(sel);

// ---------- Menu lateral ----------
function renderNav() {
  $('#nav').innerHTML = NAV.map((group) => `
    ${group.section ? `<p class="nav-section">${group.section}</p>` : ''}
    ${group.items.map((id) => `
      <a class="nav-item" href="#/${id}" data-route="${id}">${icon(PAGES[id].icon)}<span>${PAGES[id].label}</span></a>`).join('')}
    <hr class="nav-sep" />`).join('').replace(/<hr class="nav-sep" \/>\s*$/, '');
}

function renderMe() {
  const name = Store.get('profile').name.trim();
  $('#meName').textContent = name || 'Seu nome';
  $('#meAvatar').textContent = (name || 'B').charAt(0).toUpperCase();
}

// ---------- Rotas (#/pagina) ----------
function currentRoute() {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0];
  return PAGES[id] ? id : 'dashboard';
}

// Redesenha só o conteúdo da tela atual, sem rolar pro topo (usado por telas interativas).
function refreshContent() {
  const page = PAGES[currentRoute()];
  $('#content').innerHTML = page.render();
  page.afterRender?.();
}

function render() {
  const id = currentRoute();
  const page = PAGES[id];
  page.onEnter?.();
  $('#pageTitle').textContent = page.label;
  $('#pageSub').textContent = page.sub;
  document.title = id === 'dashboard' ? 'Bora Bibliar' : `${page.label} · Bora Bibliar`;
  $('#content').innerHTML = page.render();
  page.afterRender?.();
  document.querySelectorAll('.nav-item').forEach((a) => a.classList.toggle('active', a.dataset.route === id));
  closeMenu();
  $('.main').scrollTo?.(0, 0);
  window.scrollTo(0, 0);
  syncFromCloud(id);
}

// Online: ao trocar de tela, busca as novidades da comunidade e redesenha (sem atrapalhar quem está digitando).
async function syncFromCloud(id) {
  if (!Store.isCloud()) return;
  const changed = await Cloud.refreshShared();
  if (!changed || currentRoute() !== id || document.querySelector('dialog[open]')) return;
  const a = document.activeElement;
  const typing = a && $('#content').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.value;
  if (typing) return;
  refreshContent();
  renderMe();
}

// ---------- Menu no celular ----------
function openMenu() { document.body.classList.add('menu-open'); }
function closeMenu() { document.body.classList.remove('menu-open'); }

// ---------- Avisos ----------
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ---------- Ações das telas ----------
function onContentClick(e) {
  PAGES[currentRoute()].onClick?.(e);
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'export') {
    const blob = new Blob([Store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bora-bibliar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup exportado.');
  }
  if (action === 'import') $('#importFile').click();
  if (action === 'reset') {
    if (confirm('Apagar todos os dados deste navegador e recomeçar do zero? Isso não pode ser desfeito.')) {
      Store.reset(); renderMe(); render(); toast('Tudo zerado. Recomeçando!');
    }
  }
  if (action === 'update') checkForUpdates();
  if (action === 'logout' && confirm('Sair da sua conta neste aparelho?')) Cloud.signOut();
}

async function onImport(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    Store.importJson(await file.text());
    renderMe(); render(); toast('Backup importado.');
  } catch (err) {
    toast(err.message || 'Não foi possível ler esse arquivo.');
  }
}

function onSubmit(e) {
  PAGES[currentRoute()].onSubmit?.(e);
  if (e.target.id !== 'profileForm') return;
  e.preventDefault();
  const f = new FormData(e.target);
  Store.set('profile', {
    name: f.get('name').trim(),
    church: f.get('church').trim(),
    bio: f.get('bio').trim(),
  });
  renderMe(); render(); toast('Perfil salvo.');
}

// ---------- App instalável + atualizações ----------
async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) { location.reload(); return; }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) { location.reload(); return; }
  toast('Buscando atualizações…');
  await reg.update();
  const waiting = reg.waiting || reg.installing;
  if (waiting) {
    waiting.postMessage('skipWaiting');
  } else {
    // força baixar os arquivos de novo mesmo sem versão nova
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    location.reload();
  }
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ---------- Início ----------
async function boot() {
  hydrateIcons();
  renderNav();
  if (Cloud.enabled) await Cloud.start(); // online: login + dados da conta
  renderMe();
  render();
  window.addEventListener('hashchange', render);
}
boot();
$('#menuBtn').addEventListener('click', openMenu);
$('#scrim').addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
$('#content').addEventListener('click', onContentClick);
$('#content').addEventListener('submit', onSubmit);
$('#content').addEventListener('input', (e) => PAGES[currentRoute()].onInput?.(e));
$('#importFile').addEventListener('change', onImport);
registerSW();
