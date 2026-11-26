// Páginas "em breve": Plano de estudos e God Hour (encontros). Jogos & Quiz ficam em jogos.js; Materiais em materiais.js.
// Já deixam as ideias organizadas (abas, pontuação) para quando cada módulo ganhar vida.

// Pontos planejados para os módulos futuros (usados nas telas de "em breve").
const XP_SOON = {
  aula: 20,
  quiz: { facil: 5, medio: 10, dificil: 20 },
  completeFrase: 10,
  quemDisse: 10,
};

function soonCard({ emoji, title, text, bullets = [], chips = [] }) {
  return `<div class="card soon2">
    <span class="soon2-emoji" aria-hidden="true">${emoji}</span>
    <span class="pill">${icon('sparkle', 14)} em breve novidades</span>
    <h2 class="soon2-title">${title}</h2>
    <p class="soon2-text">${text}</p>
    ${bullets.length ? `<ul class="features">${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
    ${chips.length ? `<div class="soon2-chips">${chips.map((c) => `<span class="xp-chip">${c}</span>`).join('')}</div>` : ''}
  </div>`;
}

function soonTabs(state, list) {
  return `<div class="tabs" role="tablist">${list.map(([k, label]) =>
    `<button class="tab ${state === k ? 'on' : ''}" role="tab" aria-selected="${state === k}" data-soontab="${k}">${label}</button>`).join('')}</div>`;
}

// ---------- Plano de estudos ----------
PAGES.plano = {
  ...PAGES.plano,
  sub: 'vídeo aulas sobre temas bíblicos',
  render: () => soonCard({
    emoji: '🎬',
    title: 'Estamos preparando as vídeo aulas!',
    text: 'Em breve, aqui você vai encontrar <strong>aulas gravadas sobre temas bíblicos</strong>, organizadas em trilhas pra você estudar no seu ritmo. E o melhor: <strong>cada aula assistida soma XP</strong> pro seu nível e pro ranking do mês.',
    bullets: ['Aulas gravadas sobre temas bíblicos', 'Trilhas de estudo com o seu progresso', 'Materiais complementares em “Materiais e PDFs”', 'Conta pros desafios de aulas (1ª aula, 3 aulas...)'],
    chips: [`🎬 aula assistida <b>+${XP_SOON.aula} XP</b>`],
  }),
};

// ---------- God Hour (encontros ao vivo) ----------
// Usa os avisos do tipo "encontro" que a administração publica no Calendário.
let ghTab = 'proximo';
PAGES.encontros = {
  ...PAGES.encontros,
  label: 'God Hour',
  sub: 'um tempo com Deus, juntos',
  render: () => {
    const today = Devo.todayKey();
    const all = (Store.get('announcements') || []).filter((a) => a.kind === 'encontro')
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    const next = all.find((a) => a.date >= today);
    const past = all.filter((a) => a.date < today).reverse();
    const att = Store.get('attendance') || {};
    const dateTxt = (a) => new Date(a.date + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + (a.time ? ` · ${a.time}` : '');

    const body = {
      proximo: next
        ? `<div class="card gh-next"><span class="gh-emoji" aria-hidden="true">🕊️</span>
            <p class="gh-label">Nosso próximo encontro será:</p>
            <h2 class="soon2-title">${esc(next.title)}</h2>
            <p class="gh-date">${esc(dateTxt(next))}</p>
            ${next.notes ? `<p class="soon2-text">${esc(next.notes)}</p>` : ''}
            <a class="btn btn-soft" href="#/calendario">${icon('calendar', 16)} ver no calendário</a></div>`
        : soonCard({ emoji: '🕊️', title: 'Nosso próximo encontro será:', text: '<strong>Em breve!</strong> A data do próximo God Hour vai aparecer aqui assim que for marcada. Fique de olho no grupo do WhatsApp também. 💛' }),
      link: next && /^https:\/\//i.test(next.link || '')
        ? `<div class="card gh-next"><span class="gh-emoji" aria-hidden="true">🔗</span>
            <p class="gh-label">Link de acesso:</p>
            <h2 class="soon2-title">${esc(next.title)}</h2>
            <p class="gh-date">${esc(dateTxt(next))}</p>
            <a class="btn btn-gold" href="${esc(next.link)}" target="_blank" rel="noopener">${icon('video', 16)} entrar no encontro</a></div>`
        : soonCard({ emoji: '🔗', title: 'O link de acesso estará disponível aqui', text: '<strong>Em breve!</strong> No dia do encontro, é só voltar aqui e clicar pra entrar.' }),
      anteriores: past.length
        ? `<div class="card gh-past">${past.map((a) => `<div class="gh-row">
              <span class="gh-row-ico" aria-hidden="true">🎥</span>
              <span class="gh-row-txt"><strong>${esc(a.title)}</strong><small>${esc(dateTxt(a))}</small></span>
              ${att[a.id] ? '<span class="answered-badge">✓ presença marcada</span>' : ''}
              ${/^https:\/\//i.test(a.link || '') ? `<a class="btn btn-soft btn-sm" href="${esc(a.link)}" target="_blank" rel="noopener">assistir</a>` : ''}
            </div>`).join('')}</div>`
        : soonCard({ emoji: '🎥', title: 'Nossos encontros anteriores', text: '<strong>Em breve!</strong> Aqui vão ficar os encontros que já aconteceram, pra você assistir de novo quando quiser.' }),
    }[ghTab];
    return `${soonTabs(ghTab, [['proximo', '🕊️ próximo encontro'], ['link', '🔗 link de acesso'], ['anteriores', '🎥 encontros anteriores']])}${body}`;
  },
  onClick: (e) => {
    const t = e.target.closest('[data-soontab]');
    if (!t) return;
    ghTab = t.dataset.soontab;
    refreshContent();
    document.querySelector(`[data-soontab="${ghTab}"]`)?.focus();
  },
};
