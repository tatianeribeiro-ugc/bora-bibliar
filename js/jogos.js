// Jogos & Quiz: quiz por nível, complete a frase e quem disse isso.
// Cada pergunta dá XP só na PRIMEIRA vez que você acerta (dá pra jogar de novo à vontade pra treinar).
// O XP fica em Store 'xp' como { action: 'jogo', ref: 'quiz:facil:3', points } e entra no ranking.

const Games = (() => {
  const ROUND = 10;
  const MODES = {
    'quiz:facil': { tab: 'quiz', label: 'fácil', dot: '🟢', xp: XP_SOON.quiz.facil, list: () => GAME_DATA.quiz.facil },
    'quiz:medio': { tab: 'quiz', label: 'médio', dot: '🟡', xp: XP_SOON.quiz.medio, list: () => GAME_DATA.quiz.medio },
    'quiz:dificil': { tab: 'quiz', label: 'difícil', dot: '🔴', xp: XP_SOON.quiz.dificil, list: () => GAME_DATA.quiz.dificil },
    frase: { tab: 'frase', label: 'complete a frase', dot: '✍️', xp: XP_SOON.completeFrase, list: () => GAME_DATA.frase },
    quem: { tab: 'quem', label: 'quem disse isso?', dot: '🗣️', xp: XP_SOON.quemDisse, list: () => GAME_DATA.quem },
  };
  const TABS = [['quiz', '❓ quiz'], ['frase', '✍️ complete a frase'], ['quem', '🗣️ quem disse isso?']];

  let tab = 'quiz';
  let round = null; // { mode, qs: [{ idx, opts, answer }], i, picked, right, gained, done }

  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ref = (mode, idx) => `${mode}:${idx}`;
  const earnedSet = () => new Set((Store.get('xp') || []).filter((x) => x.action === 'jogo').map((x) => x.ref));

  function progress(mode) {
    const m = MODES[mode];
    const earned = earnedSet();
    const total = m.list().length;
    const got = m.list().filter((_, i) => earned.has(ref(mode, i))).length;
    return { got, total, xp: got * m.xp, max: total * m.xp };
  }

  function start(mode) {
    const list = MODES[mode].list();
    const earned = earnedSet();
    // Primeiro as que você ainda não acertou; completa com as outras pra treinar.
    const idxs = list.map((_, i) => i);
    const fresh = shuffle(idxs.filter((i) => !earned.has(ref(mode, i))));
    const old = shuffle(idxs.filter((i) => earned.has(ref(mode, i))));
    const pick = [...fresh, ...old].slice(0, ROUND);
    round = {
      mode, i: 0, picked: null, right: 0, gained: 0, done: false,
      lvlBefore: Game.levelOf(Store.totalXp()).index,
      qs: pick.map((idx) => { const [, ok, ...rest] = list[idx]; return { idx, answer: ok, opts: shuffle([ok, ...rest.slice(0, 3)]) }; }),
    };
  }

  function answer(optIndex) {
    if (!round || round.picked !== null) return;
    const q = round.qs[round.i];
    round.picked = optIndex;
    q.correct = q.opts[optIndex] === q.answer;
    q.xp = 0;
    if (q.correct) {
      round.right++;
      const r = ref(round.mode, q.idx);
      if (!earnedSet().has(r)) {
        const points = MODES[round.mode].xp;
        Store.set('xp', [...Store.get('xp'), { at: new Date().toISOString(), action: 'jogo', ref: r, points }]);
        q.xp = points;
        round.gained += points;
      }
    }
  }

  function next() {
    if (!round || round.picked === null) return;
    if (round.i + 1 < round.qs.length) { round.i++; round.picked = null; return; }
    round.done = true;
    const lvl = Game.levelOf(Store.totalXp());
    if (lvl.index > round.lvlBefore) toast(`${lvl.emoji} Subiu de nível: ${lvl.name}!`);
  }

  // ---------- telas ----------
  function bar(p) {
    const pct = p.total ? Math.round((p.got / p.total) * 100) : 0;
    return `<div class="gm-bar" role="progressbar" aria-valuenow="${p.got}" aria-valuemin="0" aria-valuemax="${p.total}" aria-label="perguntas acertadas"><span style="width:${pct}%"></span></div>`;
  }

  function modeCard(mode) {
    const m = MODES[mode];
    const p = progress(mode);
    const complete = p.got === p.total;
    return `<div class="card gm-mode">
      <div class="gm-mode-top"><strong>${m.dot} ${m.label}</strong><span class="xp-chip"><b>+${m.xp} XP</b> por acerto</span></div>
      ${bar(p)}
      <small class="muted">${p.got} de ${p.total} perguntas acertadas · <b>${p.xp}</b> de ${p.max} XP${complete ? ' · ✨ completo!' : ''}</small>
      <button class="btn ${complete ? 'btn-soft' : 'btn-navy'}" data-g-start="${mode}">${complete ? 'jogar pra treinar' : p.got ? 'continuar jogando' : 'começar'} ${icon('arrowRight', 16)}</button>
    </div>`;
  }

  function intro() {
    const text = {
      quiz: 'Perguntas com alternativas sobre toda a Bíblia, separadas por nível. Quanto mais difícil, mais XP por acerto.',
      frase: 'Um versículo aparece com uma palavra faltando. Escolha a palavra certa e vá guardando a Palavra no coração.',
      quem: 'Uma frase da Bíblia e quatro personagens. Quem disse isso?',
    }[tab];
    const modes = Object.keys(MODES).filter((k) => MODES[k].tab === tab);
    return `<p class="gm-intro">${text} Cada pergunta vale XP <strong>na primeira vez que você acerta</strong>; depois dá pra jogar de novo pra treinar. As rodadas têm ${ROUND} perguntas.</p>
      <div class="gm-modes">${modes.map(modeCard).join('')}</div>`;
  }

  function question() {
    const m = MODES[round.mode];
    const q = round.qs[round.i];
    const row = m.list()[q.idx];
    const answered = round.picked !== null;
    const prompt = round.mode === 'frase'
      ? `<p class="gm-verse">${esc(row[0]).replace('___', `<span class="gm-blank">${answered ? esc(q.answer) : '_____'}</span>`)}</p>`
      : round.mode === 'quem'
        ? `<p class="gm-verse">${esc(row[0])}</p>`
        : `<p class="gm-q">${esc(row[0])}</p>`;
    const opts = q.opts.map((o, i) => {
      let cls = '';
      if (answered) cls = o === q.answer ? 'ok' : i === round.picked ? 'no' : 'dim';
      return `<button class="gm-opt ${cls}" data-g-opt="${i}" ${answered ? 'disabled' : ''}>${esc(o)}</button>`;
    }).join('');
    const last = round.i + 1 === round.qs.length;
    const feedback = answered ? `<div class="gm-feedback ${q.correct ? 'ok' : 'no'}" role="status">
        <strong>${q.correct ? (q.xp ? `Acertou! +${q.xp} XP 🎉` : 'Acertou! 🙌') : `Quase! A resposta é: ${esc(q.answer)}`}</strong>
        ${q.correct && !q.xp ? '<small>Essa você já tinha acertado antes, o XP já está contado.</small>' : ''}
        ${row[5] ? `<small>📖 ${esc(row[5])}</small>` : ''}
        <button class="btn btn-gold" data-g-next>${last ? 'ver resultado' : 'próxima'} ${icon('arrowRight', 16)}</button>
      </div>` : '';
    return `<div class="card gm-play">
      <div class="gm-play-top"><span class="gm-tag">${m.dot} ${m.label}</span><span class="muted">pergunta ${round.i + 1} de ${round.qs.length}</span>
        <button class="btn-link sm" data-g-quit>sair</button></div>
      <div class="gm-bar"><span style="width:${Math.round(((round.i + (answered ? 1 : 0)) / round.qs.length) * 100)}%"></span></div>
      ${prompt}
      <div class="gm-opts">${opts}</div>
      ${feedback}
    </div>`;
  }

  function result() {
    const m = MODES[round.mode];
    const n = round.qs.length;
    const pct = round.right / n;
    const emoji = pct === 1 ? '🏆' : pct >= 0.7 ? '🎉' : pct >= 0.4 ? '💪' : '📖';
    const msg = pct === 1 ? 'Gabaritou! Que conhecimento da Palavra!' : pct >= 0.7 ? 'Muito bem! Mandou bem demais.' : pct >= 0.4 ? 'Bom começo! Cada rodada você aprende mais.' : 'Bora estudar mais um pouquinho e tentar de novo?';
    const p = progress(round.mode);
    return `<div class="card gm-result">
      <span class="gm-result-emoji" aria-hidden="true">${emoji}</span>
      <h2 class="soon2-title">Você acertou ${round.right} de ${n}</h2>
      <p class="soon2-text">${msg}</p>
      <span class="xp-chip">${round.gained ? `<b>+${round.gained} XP</b> nesta rodada` : 'nenhum XP novo nesta rodada'}</span>
      <small class="muted">${m.dot} ${m.label}: ${p.got} de ${p.total} perguntas acertadas no total</small>
      <div class="actions"><button class="btn btn-navy" data-g-start="${round.mode}">jogar de novo</button>
        <button class="btn btn-soft" data-g-quit>escolher outro jogo</button></div>
    </div>`;
  }

  function render() {
    const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, label]) =>
      `<button class="tab ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-g-tab="${k}">${label}</button>`).join('')}</div>`;
    if (round) return tabs + (round.done ? result() : question());
    return tabs + intro();
  }

  function focusAndShow(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.closest('.card')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function onClick(e) {
    const t = e.target;
    const tb = t.closest('[data-g-tab]');
    if (tb) { tab = tb.dataset.gTab; round = null; refreshContent(); return focusAndShow(`[data-g-tab="${tab}"]`); }
    const st = t.closest('[data-g-start]');
    if (st) { start(st.dataset.gStart); refreshContent(); return focusAndShow('[data-g-opt="0"]'); }
    const op = t.closest('[data-g-opt]');
    if (op) { answer(Number(op.dataset.gOpt)); refreshContent(); return focusAndShow('[data-g-next]'); }
    if (t.closest('[data-g-next]')) { next(); refreshContent(); return focusAndShow(round.done ? '[data-g-start]' : '[data-g-opt="0"]'); }
    if (t.closest('[data-g-quit]')) { round = null; refreshContent(); return focusAndShow(`[data-g-tab="${tab}"]`); }
  }

  const total = () => Object.keys(MODES).reduce((s, k) => s + MODES[k].list().length, 0);
  return { render, onClick, total };
})();

PAGES.jogos = { ...PAGES.jogos, sub: 'aprender brincando', render: Games.render, onClick: Games.onClick };
