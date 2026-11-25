// Desafios, níveis, medalhas e ranking.
// ============================================================
//  CONFIGURAÇÃO — nomes, pontos e regras ficam todos aqui.
// ============================================================

const XP_RULES = {
  devocional: 10, // por devocional concluído (ver devocional.js)
  livro: 30, // por livro da Biblioteca marcado como concluído (ver biblioteca.js)
};

const DIFFICULTY = {
  facil: { label: 'fácil', xp: 50 },
  medio: { label: 'médio', xp: 150 },
  dificil: { label: 'difícil', xp: 400 },
  lendario: { label: 'lendário', xp: 1000 },
};

// Níveis: a partir de quantos XP a pessoa chega em cada um.
const LEVELS = [
  { xp: 0, emoji: '🌱', name: 'Semente' },
  { xp: 150, emoji: '🌿', name: 'Broto' },
  { xp: 400, emoji: '📖', name: 'Aprendiz da Palavra' },
  { xp: 800, emoji: '🪔', name: 'Lâmpada Acesa' },
  { xp: 1400, emoji: '🌳', name: 'Raiz Profunda' },
  { xp: 2200, emoji: '🍇', name: 'Fruto Bom' },
  { xp: 3200, emoji: '🧂', name: 'Sal da Terra' },
  { xp: 4500, emoji: '💡', name: 'Luz do Mundo' },
  { xp: 6000, emoji: '🗼', name: 'Atalaia' },
  { xp: 8000, emoji: '👑', name: 'Fiel até o Fim' },
];

// Medalhas: vêm pela quantidade de desafios concluídos (`at`).
const MEDALS = [
  { at: 3, emoji: '🌱', name: 'Primeiro passo' },
  { at: 7, emoji: '🏅', name: 'Primeira conquista' },
  { at: 10, emoji: '🧭', name: 'Rumo certo' },
  { at: 13, emoji: '🔥', name: 'Fogo aceso' },
  { at: 16, emoji: '💎', name: 'Caça-promessas' },
  { at: 19, emoji: '✍️', name: 'Escriba' },
  { at: 22, emoji: '⚡', name: 'Imparável' },
  { at: 25, emoji: '⭐', name: 'Clube dos 1.000' },
  { at: 28, emoji: '👑', name: 'Coroa da vida' }, // todos os desafios
];

// Livros da Bíblia (para a lista "livros que já li" e os desafios de leitura).
const BIBLE_OT = ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias'];
const BIBLE_NT = ['Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas', 'Apocalipse'];
const GOSPELS = ['Mateus', 'Marcos', 'Lucas', 'João'];

// Desafios. Com `goal`, o app confere sozinho: só libera o "concluí!" quando a meta é batida.
// Sem `goal`, vale a palavra da pessoa.
const CHALLENGES = [
  { id: 'perfil', diff: 'facil', cat: 'Primeiros passos', title: 'Perfil completo', desc: 'Preencha seu nome e uma frase sobre você em Meu perfil.', goal: (s) => [s.profileOk ? 1 : 0, 1] },
  { id: 'primeiro-devocional', diff: 'facil', cat: 'Devocional', title: 'Primeiro devocional', desc: 'Conclua seu primeiro devocional. Todo caminho começa com um passo.', goal: (s) => [s.devDone, 1] },
  { id: 'semana-planejada', diff: 'facil', cat: 'Devocional', title: 'Semana planejada', desc: 'Planeje as leituras dos 7 dias de uma semana no Meu devocional.', goal: (s) => [s.bestWeekPlan, 7] },
  { id: 'primeiro-encontro', diff: 'facil', cat: 'Encontros', title: 'Primeiro encontro ao vivo', desc: 'Participe de um encontro ao vivo e confirme sua presença com a palavra-chave do vídeo, no Calendário Bíblico.', goal: (s) => [s.encontros, 1] },
  { id: 'primeiro-livro', diff: 'facil', cat: 'Biblioteca', title: 'Primeiro livro', desc: 'Termine seu primeiro livro da Biblioteca e marque “concluído” em Minha leitura.', goal: (s) => [s.booksRead, 1] },
  { id: 'versiculo-decorado', diff: 'facil', cat: 'Palavra', title: 'Versículo decorado', desc: 'Decore um versículo e recite pra alguém. “Escondi a tua palavra no meu coração.”' },
  { id: 'primeira-aula', diff: 'facil', cat: 'Estudos', title: 'Primeira aula', desc: 'Assista à sua primeira aula do plano de estudos.' },
  { id: '1-livro-biblia', diff: 'facil', cat: 'Leitura', title: '1 livro da Bíblia', desc: 'Leia um livro da Bíblia inteiro e marque na lista de livros lidos.', goal: (s) => [s.bibleBooks, 1] },
  { id: 'membro-igreja', diff: 'facil', cat: 'Igreja', title: 'Membro da igreja', desc: 'Seja membro de uma igreja local. Ninguém caminha sozinho.' },

  { id: '7-dias', diff: 'medio', cat: 'Devocional', title: 'Semana de constância', desc: 'Faça o devocional 7 dias seguidos, sem pular nenhum.', goal: (s) => [s.bestStreak, 7] },
  { id: '10-devocionais', diff: 'medio', cat: 'Devocional', title: '10 devocionais', desc: 'Conclua 10 devocionais (não precisa ser seguido).', goal: (s) => [s.devDone, 10] },
  { id: '2-livros-biblia', diff: 'medio', cat: 'Leitura', title: '2 livros da Bíblia', desc: 'Leia dois livros da Bíblia inteiros e marque na lista.', goal: (s) => [s.bibleBooks, 2] },
  { id: 'evangelho', diff: 'medio', cat: 'Leitura', title: 'Um Evangelho inteiro', desc: 'Leia Mateus, Marcos, Lucas ou João do começo ao fim. Marcos tem só 16 capítulos!', goal: (s) => [s.gospels ? 1 : 0, 1] },
  { id: 'proverbios', diff: 'medio', cat: 'Leitura', title: 'Provérbios em 31 dias', desc: 'Um capítulo de Provérbios por dia, durante um mês.' },
  { id: 'compartilhe', diff: 'medio', cat: 'Comunidade', title: 'Compartilhe a Palavra', desc: 'Conte pra 3 pessoas algo que Deus te falou no devocional.' },
  { id: '3-versiculos', diff: 'medio', cat: 'Palavra', title: '3 versículos decorados', desc: 'Decore três versículos. A Palavra guardada vem à memória na hora certa.' },
  { id: '3-aulas', diff: 'medio', cat: 'Estudos', title: '3 aulas assistidas', desc: 'Assista a três aulas do plano de estudos.' },
  { id: '3-encontros', diff: 'medio', cat: 'Encontros', title: 'Presente em 3 encontros', desc: 'Participe de três encontros ao vivo e confirme cada presença com a palavra-chave do vídeo.', goal: (s) => [s.encontros, 3] },

  { id: '30-dias', diff: 'dificil', cat: 'Devocional', title: '30 dias de constância', desc: 'Um mês inteiro de devocional, sem pular nenhum dia.', goal: (s) => [s.bestStreak, 30] },
  { id: '50-devocionais', diff: 'dificil', cat: 'Devocional', title: '50 devocionais', desc: 'Conclua 50 devocionais. Seu caderno já conta uma história.', goal: (s) => [s.devDone, 50] },
  { id: 'nt-inteiro', diff: 'dificil', cat: 'Leitura', title: 'Novo Testamento inteiro', desc: 'Leia os 27 livros do Novo Testamento e marque na lista.', goal: (s) => [s.ntBooks, BIBLE_NT.length] },
  { id: 'salmodiando', diff: 'dificil', cat: 'Palavra', title: 'Salmodiando', desc: 'Decore um salmo inteiro (que tal o 23 ou o 91?).' },
  { id: '3-livros', diff: 'dificil', cat: 'Biblioteca', title: '3 livros concluídos', desc: 'Termine três livros da Biblioteca e marque como concluídos em Minha leitura.', goal: (s) => [s.booksRead, 3] },
  { id: 'evangelizando', diff: 'dificil', cat: 'Missão', title: 'Evangelizando', desc: 'Compartilhe o evangelho com alguém que ainda não conhece Jesus.' },
  { id: 'trabalhando-igreja', diff: 'dificil', cat: 'Igreja', title: 'Trabalhando na igreja', desc: 'Sirva em um ministério da sua igreja.' },

  { id: 'biblia-1-ano', diff: 'lendario', cat: 'Leitura', title: 'Bíblia em 1 ano', desc: 'Leia a Bíblia inteira em até um ano. De Gênesis a Apocalipse!' },
  { id: '100-dias', diff: 'lendario', cat: 'Devocional', title: '100 dias de constância', desc: 'Cem dias de devocional sem pular. Lendário mesmo.', goal: (s) => [s.bestStreak, 100] },
  { id: 'discipulado', diff: 'lendario', cat: 'Comunidade', title: 'Discipulado', desc: 'Seja discipulado(a) ou discipule alguém do começo ao fim.' },
];

// ============================================================
//  MOTOR — não precisa mexer daqui pra baixo para mudar regras.
// ============================================================

const Game = (() => {
  const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const doneMap = () => Store.get('challenges') || {};
  const doneCount = () => Object.keys(doneMap()).filter((id) => CHALLENGES.some((c) => c.id === id)).length;

  function stats() {
    const devs = Store.get('devotionals') || {};
    const doneDays = Object.keys(devs).filter((k) => devs[k].done).sort();
    let best = 0, run = 0, prev = null;
    for (const k of doneDays) {
      const d = dateOf(k);
      run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    const entries = Object.values(devs);
    const filled = (f) => entries.filter((e) => (e[f] || '').trim()).length;
    const weeks = {};
    for (const [k, e] of Object.entries(devs)) {
      if (!(e.ref || '').trim()) continue;
      const d = dateOf(k);
      const wk = keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()));
      weeks[wk] = (weeks[wk] || 0) + 1;
    }
    const bestWeekPlan = Math.max(0, ...Object.values(weeks));
    const p = Store.get('profile');
    const books = Object.keys(Store.get('bibleBooks') || {});
    const annIds = new Set((Store.get('announcements') || []).map((a) => a.id));
    return {
      encontros: Object.keys(Store.get('attendance') || {}).filter((id) => annIds.has(id)).length,
      bibleBooks: books.length,
      booksRead: typeof Library !== 'undefined' ? Library.booksRead() : 0,
      ntBooks: books.filter((b) => BIBLE_NT.includes(b)).length,
      gospels: books.some((b) => GOSPELS.includes(b)),
      devDone: doneDays.length,
      bestStreak: best,
      promessas: entries.filter((e) => (e.promessa || '').trim() && (e.condicao || '').trim()).length,
      caracteristicas: filled('caracteristicas'),
      bestWeekPlan,
      weekPlanned: bestWeekPlan >= 7,
      events: (Store.get('events') || []).length,
      profileOk: !!((p.name || '').trim() && (p.bio || '').trim()),
      xp: Store.totalXp(),
      challengesDone: doneCount(),
    };
  }

  function levelOf(xp) {
    let i = 0;
    while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
    return { index: i, ...LEVELS[i], next: LEVELS[i + 1] || null };
  }

  const earnedMedals = (s = stats()) => MEDALS.filter((m) => s.challengesDone >= m.at).map((m) => m.name);

  // Desafios que saíram da lista não contam mais (nem os XP deles).
  (function cleanup() {
    const valid = new Set(CHALLENGES.map((c) => c.id));
    const map = doneMap();
    const stale = Object.keys(map).filter((id) => !valid.has(id));
    if (!stale.length) return;
    stale.forEach((id) => delete map[id]);
    Store.set('challenges', map);
    Store.set('xp', Store.get('xp').filter((x) => !(x.action === 'desafio' && !valid.has(x.ref))));
  })();

  function progressOf(c, s) {
    if (!c.goal) return null;
    const [cur, target] = c.goal(s);
    return { cur: Math.min(cur, target), target, met: cur >= target };
  }

  function complete(id) {
    const c = CHALLENGES.find((x) => x.id === id);
    if (!c || doneMap()[id]) return;
    const before = stats();
    const p = progressOf(c, before);
    if (p && !p.met) return;
    const lvlBefore = levelOf(before.xp).index;
    const medalsBefore = earnedMedals(before);

    Store.set('challenges', { ...doneMap(), [id]: new Date().toISOString() });
    const points = DIFFICULTY[c.diff].xp;
    Store.set('xp', [...Store.get('xp'), { at: new Date().toISOString(), action: 'desafio', ref: id, points }]);

    const after = stats();
    const lvl = levelOf(after.xp);
    const newMedals = MEDALS.filter((m) => after.challengesDone >= m.at && !medalsBefore.includes(m.name));
    let msg = `🎉 Desafio concluído! +${points} XP`;
    if (lvl.index > lvlBefore) msg = `${lvl.emoji} Subiu de nível: ${lvl.name}! +${points} XP`;
    else if (newMedals.length) msg = `${newMedals[0].emoji} Nova medalha: ${newMedals[0].name}! +${points} XP`;
    toast(msg);
  }

  function undo(id) {
    const map = doneMap();
    delete map[id];
    Store.set('challenges', map);
    Store.set('xp', Store.get('xp').filter((x) => !(x.action === 'desafio' && x.ref === id)));
  }

  // Ranking: hoje só existe você neste aparelho. No multiusuário, vem do Supabase.
  function rankingRows(period) {
    const now = new Date();
    const inMonth = (x) => { const d = new Date(x.at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); };
    const xpList = Store.get('xp');
    const list = period === 'mes' ? xpList.filter(inMonth) : xpList;
    const name = (Store.get('profile').name || '').trim() || 'Você';
    const me = {
      name, me: true,
      xp: list.reduce((s, x) => s + (x.points || 0), 0),
      challenges: list.filter((x) => x.action === 'desafio').length,
    };
    // online: junta o placar de toda a comunidade (você sempre com o valor mais atual)
    const comm = Store.get('community');
    if (!comm) return [me];
    const mk = Cloud.monthKey();
    const others = comm.filter((p) => p.id !== Cloud.userId()).map((p) => ({
      name: (p.name || '').trim() || 'Sem nome',
      xp: period === 'mes' ? (p.month_key === mk ? p.xp_month : 0) : p.xp_total,
      challenges: period === 'mes' ? (p.month_key === mk ? p.ch_month : 0) : p.ch_total,
    })).filter((r) => r.xp > 0);
    return [me, ...others].sort((a, b) => b.xp - a.xp || (b.me ? 1 : 0) - (a.me ? 1 : 0));
  }

  // ---------- telas ----------
  let filter = 'todos';
  let period = 'mes';

  function levelCard() {
    const s = stats();
    const lv = levelOf(s.xp);
    const pct = lv.next ? Math.round(((s.xp - lv.xp) / (lv.next.xp - lv.xp)) * 100) : 100;
    return `
      <div class="lvl">
        <div class="lvl-id">
          <span class="lvl-badge" aria-hidden="true">${lv.emoji}</span>
          <span><small>nível ${lv.index + 1}</small><strong>${lv.name}</strong></span>
        </div>
        <div class="lvl-bar">
          <div class="lvl-bar-top">
            <strong>${s.xp} XP</strong>
            <span>${lv.next ? `${lv.next.xp - s.xp} XP até ${lv.next.emoji} ${lv.next.name}` : 'nível máximo! 🙌'}</span>
          </div>
          <div class="bar" role="progressbar" aria-label="Progresso até o próximo nível" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
        </div>
        <div class="lvl-stats">
          <span><strong>${s.challengesDone}</strong><small>de ${CHALLENGES.length} desafios</small></span>
          <span><strong>${earnedMedals(s).length}</strong><small>medalhas</small></span>
        </div>
      </div>`;
  }

  function rankingHtml() {
    const rows = rankingRows(period);
    const now = new Date();
    const pos = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}º`;
    return `
      <div class="section-row">
        <h3 class="section-title">🏆 ranking ${period === 'mes' ? `de ${MESES[now.getMonth()]}` : 'geral'}</h3>
        <div class="filters" role="group" aria-label="Período do ranking">
          <button class="filter ${period === 'mes' ? 'on' : ''}" data-period="mes" aria-pressed="${period === 'mes'}">do mês</button>
          <button class="filter ${period === 'geral' ? 'on' : ''}" data-period="geral" aria-pressed="${period === 'geral'}">geral</button>
        </div>
      </div>
      <div class="card rank">
        ${rows.map((r, i) => `
          <div class="rank-row ${r.me ? 'me' : ''}">
            <span class="rank-pos">${pos(i)}</span>
            <span class="rank-name">${esc(r.name)}${r.me ? ' <em>você</em>' : ''}</span>
            <span class="rank-xp">${r.xp} XP</span>
            <span class="rank-ch">${r.challenges} ${r.challenges === 1 ? 'desafio' : 'desafios'}</span>
          </div>`).join('')}
        ${rows.length < 2 ? `<p class="rank-empty">${Store.isCloud() ? 'Quem fizer XP neste período aparece aqui. Bora bibliar! 🙌' : 'Quando o hub abrir para a comunidade, todo mundo aparece aqui. 🙌'}</p>` : ''}
      </div>
      <div class="prize">
        <span class="prize-ico">🎁</span>
        <p><strong>Premiação mensal:</strong> o 1º lugar do ranking do mês ganha um prêmio. E todo mundo que está no ranking do mês participa de <strong>1 sorteio</strong>, menos o 1º lugar, que já foi premiado. O ranking recomeça todo dia 1º. Cada XP conta!</p>
      </div>`;
  }

  function challengeCard(c, s, done) {
    const d = DIFFICULTY[c.diff];
    const p = progressOf(c, s);
    let action;
    if (done) action = `<button class="btn btn-outline btn-sm" data-undo="${c.id}">desfazer</button>`;
    else if (p && !p.met) action = `<span class="ch-locked">${icon('lock', 14)} ${p.cur}/${p.target}</span>`;
    else action = `<button class="btn btn-navy btn-sm" data-complete="${c.id}">concluí! 🎉</button>`;
    return `
      <article class="ch ${done ? 'done' : ''}">
        <div class="ch-top"><span class="diff diff-${c.diff}">${d.label}</span><strong class="ch-xp">+${d.xp} XP</strong></div>
        <h4>${done ? '✅ ' : ''}${c.title}</h4>
        <p>${c.desc}</p>
        ${p && !done ? `<div class="ch-prog" aria-hidden="true"><i style="width:${Math.round((p.cur / p.target) * 100)}%"></i></div>` : ''}
        <div class="ch-foot"><span class="ch-cat">${c.cat}${p ? ' · confere sozinho' : ''}</span>${action}</div>
      </article>`;
  }

  let booksOpen = false;
  function booksHtml() {
    const read = Store.get('bibleBooks') || {};
    const n = Object.keys(read).length;
    const group = (title, list) => `
      <div class="books-group">
        <h4>${title} <small>${list.filter((b) => read[b]).length}/${list.length}</small></h4>
        <div class="books">${list.map((b) => `<button class="book ${read[b] ? 'on' : ''}" data-book="${b}" aria-pressed="${!!read[b]}">${read[b] ? icon('check', 13) : ''}${b}</button>`).join('')}</div>
      </div>`;
    return `
      <div class="card books-card">
        <button class="books-toggle" data-books-toggle aria-expanded="${booksOpen}">
          <span class="books-ico" aria-hidden="true">📚</span>
          <span class="books-txt"><strong>Livros da Bíblia que já li</strong><small>${n} de 66 · conta para os desafios de leitura</small></span>
          ${icon('chevronRight', 18)}
        </button>
        ${booksOpen ? `<p class="muted books-help">Marque o livro quando terminar de ler ele inteiro.</p>${group('Antigo Testamento', BIBLE_OT)}${group('Novo Testamento', BIBLE_NT)}` : ''}
      </div>`;
  }

  function render() {
    const s = stats();
    const done = doneMap();
    const earned = earnedMedals(s);
    const list = CHALLENGES.filter((c) => filter === 'todos' || (filter === 'feitos' ? done[c.id] : c.diff === filter));
    const filters = [['todos', 'todos'], ...Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label]), ['feitos', 'concluídos']];
    return `
      <div class="card intro">
        <p>Tudo que você faz no Hub soma <strong>XP</strong> (pontos): devocionais, vídeos assistidos, livros e materiais lidos, jogos e quiz… No final desta página você encontra o <strong>ranking</strong>, e todo mês tem <strong>premiação para o 1º lugar + 1 sorteio</strong>. Então participe sempre que puder e estude muitooooo a Bíblia. Boa sorte! 🙏</p>
        <div class="xp-rules">
          <span>📖 devocional <b>+${XP_RULES.devocional}</b></span>
          ${Object.values(DIFFICULTY).map((d) => `<span>🎯 desafio ${d.label} <b>+${d.xp}</b></span>`).join('')}
          <span>📚 livro concluído <b>+${XP_RULES.livro}</b></span>
          <span class="soon-rule">🎮 jogos e vídeos <b>em breve</b></span>
        </div>
      </div>

      ${levelCard()}

      <h3 class="section-title">suas medalhas</h3>
      <div class="medals">
        ${MEDALS.map((m) => {
          const ok = earned.includes(m.name);
          const how = m.at >= CHALLENGES.length ? 'complete todos os desafios' : `complete ${m.at} desafios`;
          return `<div class="medal ${ok ? 'on' : ''}" title="${ok ? 'Conquistada!' : 'Como ganhar: ' + how}">
            <span class="medal-ico" aria-hidden="true">${ok ? m.emoji : '🔒'}</span>
            <strong>${m.name}</strong>
            <small>${ok ? 'conquistada' : `${Math.min(s.challengesDone, m.at)}/${m.at} desafios`}</small>
          </div>`;
        }).join('')}
      </div>

      ${booksHtml()}

      <div class="section-row">
        <h3 class="section-title">desafios</h3>
        <div class="filters" role="group" aria-label="Filtrar desafios">
          ${filters.map(([k, label]) => `<button class="filter ${filter === k ? 'on' : ''}" data-filter="${k}" aria-pressed="${filter === k}">${label}</button>`).join('')}
        </div>
      </div>
      <div class="ch-grid">
        ${list.map((c) => challengeCard(c, s, !!done[c.id])).join('') || '<p class="muted">Nenhum desafio aqui ainda.</p>'}
      </div>

      <div id="ranking">${rankingHtml()}</div>`;
  }

  function onClick(e) {
    const t = e.target;
    const f = t.closest('[data-filter]');
    if (f) { filter = f.dataset.filter; refreshContent(); document.querySelector(`[data-filter="${filter}"]`)?.focus(); return; }
    if (t.closest('[data-books-toggle]')) { booksOpen = !booksOpen; refreshContent(); document.querySelector('[data-books-toggle]')?.focus(); return; }
    const book = t.closest('[data-book]');
    if (book) {
      const name = book.dataset.book;
      const read = Store.get('bibleBooks') || {};
      if (read[name]) delete read[name]; else read[name] = new Date().toISOString();
      Store.set('bibleBooks', read);
      refreshContent();
      document.querySelector(`[data-book="${name}"]`)?.focus();
      return;
    }
    const per = t.closest('[data-period]');
    if (per) { period = per.dataset.period; refreshContent(); document.querySelector(`[data-period="${period}"]`)?.focus(); return; }
    const c = t.closest('[data-complete]');
    if (c) { complete(c.dataset.complete); refreshContent(); document.querySelector(`[data-undo="${c.dataset.complete}"]`)?.focus(); return; }
    const u = t.closest('[data-undo]');
    if (u) {
      const ch = CHALLENGES.find((x) => x.id === u.dataset.undo);
      if (!confirm(`Desfazer “${ch?.title}”? Os ${DIFFICULTY[ch?.diff]?.xp || ''} XP saem do seu total.`)) return;
      undo(u.dataset.undo); refreshContent(); toast('Desafio desfeito.');
    }
  }

  return { render, rankingHtml, onClick, doneCount, stats, levelOf };
})();

PAGES.desafios = {
  ...PAGES.desafios,
  label: 'Desafios',
  sub: 'complete, ganhe XP e suba no ranking',
  render: Game.render,
  onClick: Game.onClick,
};

PAGES.ranking = {
  ...PAGES.ranking,
  sub: 'quem mais bibliou este mês',
  render: () => Game.rankingHtml(),
  onClick: Game.onClick,
};
