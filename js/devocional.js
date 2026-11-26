// Meu devocional: semana conforme a data, leitura planejada por dia e campos de reflexão.
// Dados: Store 'devotionals' = { 'AAAA-MM-DD': { ref, resumo, caracteristicas, promessa, condicao, versiculo, resposta, done } }

const Devo = (() => {
  const XP_PER_DAY = XP_RULES.devocional; // definido em desafios.js
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const FIELDS = [
    { key: 'resumo', label: 'Resumo', ph: 'Com suas palavras, o que você entendeu do texto?',
      hint: 'Após a leitura do texto bíblico, faça um resumo breve sobre o que você entendeu. Leia quantas vezes for preciso.' },
    { key: 'caracteristicas', label: 'Características de Deus', ph: 'Quem Deus é neste texto?',
      hint: 'Perceba como Deus aparece nesse texto: qualidades, personalidade, humor, caráter… Quem Ele é? Como você O enxerga aqui?' },
    { key: 'promessa', label: 'Promessa e condição', pair: true,
      hint: `Tem alguma promessa nesse texto? Anote! Promessas geralmente são acompanhadas de uma condição. Encontre e anote!
        <div class="hint-ex"><em>“Porque Deus amou o mundo de tal maneira, que deu o Seu único Filho, para que todo aquele que Nele crer não pereça, mas tenha vida eterna.”</em> João 3:16
        <span><strong>Promessa:</strong> não perecer e alcançar a vida eterna.</span>
        <span><strong>Condição:</strong> todo aquele que Nele crer.</span></div>` },
    { key: 'versiculo', label: 'Versículo-chave', ph: 'Ex.: Salmos 23:1, e o que ele diz',
      hint: 'Qual versículo mais fala com você? Aquele que mais te chamou atenção.' },
    { key: 'resposta', label: 'Resposta (aplicação pessoal)', private: true, ph: 'Como isso muda a sua vida?',
      hint: 'É uma área particular. Escreva como isso muda a sua vida, o que você precisa fazer daqui em diante, o que Deus está te falando…' },
  ];
  const TEXT_KEYS = ['resumo', 'caracteristicas', 'promessa', 'condicao', 'versiculo', 'resposta'];

  // ---------- datas ----------
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayKey = () => keyOf(new Date());
  const weekOf = (k) => { const d = dateOf(k); const start = addDays(d, -d.getDay()); return [0, 1, 2, 3, 4, 5, 6].map((i) => keyOf(addDays(start, i))); };
  const short = (k) => { const d = dateOf(k); return `${d.getDate()} ${MES[d.getMonth()]}`; };
  const long = (k) => dateOf(k).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  // ---------- dados ----------
  const all = () => Store.get('devotionals') || {};
  const entry = (k) => all()[k] || {};
  function save(k, patch) {
    const a = all();
    a[k] = { ...a[k], ...patch };
    Store.set('devotionals', a);
  }
  // ---------- plano de 30 dias (sugestão que começa no dia em que a pessoa entra no Hub) ----------
  function ensurePlan() {
    if (!Store.get('devoPlan')?.start) Store.set('devoPlan', { start: todayKey() });
  }
  function suggestion(k) {
    const start = Store.get('devoPlan')?.start;
    if (!start) return null;
    const i = Math.round((dateOf(k) - dateOf(start)) / 864e5);
    return i >= 0 && i < PLANO_30.length ? { day: i + 1, ...PLANO_30[i] } : null;
  }

  const hasContent = (e) => TEXT_KEYS.some((f) => (e[f] || '').trim());
  const statusOf = (e) => (e.done ? 'done' : hasContent(e) ? 'started' : '');

  function setDone(k, done) {
    save(k, { done });
    const xp = Store.get('xp').filter((x) => !(x.action === 'devocional' && x.day === k));
    if (done) xp.push({ at: new Date().toISOString(), action: 'devocional', day: k, points: XP_PER_DAY });
    Store.set('xp', xp);
  }

  function streak() {
    let d = new Date();
    if (!entry(keyOf(d)).done) d = addDays(d, -1);
    let n = 0;
    while (entry(keyOf(d)).done) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------- estado da tela ----------
  let selected = todayKey();
  let planOpen = false;

  function dayChip(k, today) {
    const e = entry(k);
    const d = dateOf(k);
    const sug = e.ref ? null : suggestion(k);
    const ref = e.ref || sug?.ref || '';
    const cls = ['day', k === selected && 'sel', k === today && 'today', statusOf(e)].filter(Boolean).join(' ');
    return `<button class="${cls}" data-day="${k}" aria-pressed="${k === selected}" aria-label="${esc(long(k))}${ref ? (sug ? ': sugestão ' : ': ') + esc(ref) : ''}">
      <span class="day-wd">${WD[d.getDay()]}</span>
      <span class="day-n">${d.getDate()}</span>
      <span class="day-ref ${sug ? 'sug' : ''}">${esc(ref)}</span>
      <span class="day-dot" aria-hidden="true">${e.done ? icon('check', 12) : ''}</span>
    </button>`;
  }

  function fieldHtml(f, e) {
    const head = `
      <div class="field-head">
        <span class="field-label">${f.label}</span>
        ${f.private ? `<span class="private">${icon('lock', 13)} particular</span>` : ''}
        <button type="button" class="info" data-info="${f.key}" aria-expanded="false" aria-controls="h-${f.key}" aria-label="Como preencher: ${f.label}">i</button>
      </div>
      <div class="hint" id="h-${f.key}" hidden>${f.hint}</div>`;
    if (f.pair) {
      return `<div class="field">${head}
        <div class="pair">
          <label><small>Promessa</small><textarea data-field="promessa" rows="3" placeholder="O que Deus promete?">${esc(e.promessa)}</textarea></label>
          <label><small>Condição</small><textarea data-field="condicao" rows="3" placeholder="O que é preciso para recebê-la?">${esc(e.condicao)}</textarea></label>
        </div></div>`;
    }
    return `<div class="field">${head}
      <textarea data-field="${f.key}" rows="${f.key === 'versiculo' ? 2 : 4}" aria-label="${f.label}" placeholder="${f.ph}">${esc(e[f.key])}</textarea></div>`;
  }

  function render() {
    const today = todayKey();
    const week = weekOf(selected);
    const e = entry(selected);
    const future = selected > today;

    const plan = planOpen ? `
      <div class="card plan">
        <p class="muted">Deixe os textos da semana prontos. No momento do devocional é só abrir e ler.</p>
        <div class="plan-rows">
          ${week.map((k) => `
            <label class="plan-row ${k === today ? 'today' : ''}">
              <span>${WD[dateOf(k).getDay()]} · ${short(k)}</span>
              <input data-plan="${k}" value="${esc(entry(k).ref)}" placeholder="${esc(suggestion(k)?.ref || 'Ex.: Salmos 23')}" maxlength="80" />
            </label>`).join('')}
        </div>
      </div>` : '';

    const sug = suggestion(selected);
    const using = sug && (e.ref || '').trim() === sug.ref;
    const sugCard = sug ? `
      <div class="card devo-sug">
        <span class="devo-sug-ico" aria-hidden="true">💡</span>
        <div class="devo-sug-txt">
          <small>sugestão do dia · plano de 30 dias · dia ${sug.day} de ${PLANO_30.length}</small>
          <strong>${esc(sug.tema)}</strong>
          <span class="devo-sug-ref">${icon('bookOpen', 14)} ${esc(sug.ref)}</span>
          <span class="devo-sug-q">Pra pensar: ${esc(sug.pensar)}</span>
        </div>
        ${using ? '<span class="answered-badge">✓ leitura do dia</span>'
          : `<button class="btn btn-soft btn-sm" data-devo="usesug">${e.ref ? 'trocar por esta' : 'usar esta leitura'}</button>`}
      </div>` : '';

    return `
      <div class="devo-bar">
        <div class="week-nav">
          <button class="icon-btn sm" data-devo="prev" aria-label="Semana anterior">${icon('chevronLeft', 18)}</button>
          <strong>${short(week[0])} – ${short(week[6])}</strong>
          <button class="icon-btn sm" data-devo="next" aria-label="Próxima semana">${icon('chevronRight', 18)}</button>
        </div>
        <div class="devo-bar-actions">
          ${weekOf(today)[0] !== week[0] || selected !== today ? '<button class="btn btn-soft btn-sm" data-devo="today">hoje</button>' : ''}
          <button class="btn btn-soft btn-sm" data-devo="plan" aria-expanded="${planOpen}">${icon('calendar', 16)} planejar leituras</button>
        </div>
      </div>

      <div class="week">${week.map((k) => dayChip(k, today)).join('')}</div>
      ${plan}
      ${sugCard}

      <div class="card devo">
        <div class="devo-head">
          <p class="eyebrow">${esc(long(selected))}${selected === today ? ' · hoje' : ''}</p>
          <span class="saved" id="devoSaved">${icon('check', 14)} salvo</span>
        </div>
        <label class="ref-field">
          <span class="ref-ico">${icon('bookOpen', 22)}</span>
          <input data-field="ref" value="${esc(e.ref)}" placeholder="Texto bíblico do dia (ex.: Salmos 23)" maxlength="80" aria-label="Texto bíblico do dia" />
        </label>

        ${FIELDS.map((f) => fieldHtml(f, e)).join('')}

        <div class="devo-foot">
          ${e.done
            ? `<span class="done-badge">${icon('check', 16)} devocional concluído · +${XP_PER_DAY} XP</span>
               <button class="btn btn-link" data-devo="undo">desmarcar</button>`
            : `<button class="btn btn-gold" data-devo="done" ${future ? 'disabled' : ''}>${icon('check', 16)} concluir devocional · +${XP_PER_DAY} XP</button>
               ${future ? '<small class="muted">Dá pra planejar o texto, mas só concluir no dia.</small>' : ''}`}
        </div>
      </div>`;
  }

  // ---------- interações ----------
  let savedTimer;
  function flashSaved() {
    const el = document.getElementById('devoSaved');
    if (!el) return;
    el.classList.add('show');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => el.classList.remove('show'), 1400);
  }

  function refreshChip(k) {
    const old = document.querySelector(`[data-day="${k}"]`);
    if (old) old.outerHTML = dayChip(k, todayKey());
  }

  function rerender(focusSel) {
    refreshContent();
    if (focusSel) document.querySelector(focusSel)?.focus();
  }

  function onClick(e) {
    const info = e.target.closest('[data-info]');
    if (info) {
      const hint = document.getElementById(`h-${info.dataset.info}`);
      const open = hint.hidden;
      hint.hidden = !open;
      info.setAttribute('aria-expanded', String(open));
      return;
    }
    const day = e.target.closest('[data-day]');
    if (day) { selected = day.dataset.day; rerender(`[data-day="${selected}"]`); return; }

    const btn = e.target.closest('[data-devo]');
    if (!btn) return;
    const a = btn.dataset.devo;
    if (a === 'prev' || a === 'next') {
      selected = keyOf(addDays(dateOf(selected), a === 'prev' ? -7 : 7));
      rerender(`[data-devo="${a}"]`);
    }
    if (a === 'today') { selected = todayKey(); rerender(`[data-day="${selected}"]`); }
    if (a === 'plan') { planOpen = !planOpen; rerender(planOpen ? '[data-plan]' : '[data-devo="plan"]'); }
    if (a === 'done') { setDone(selected, true); rerender('[data-devo="undo"]'); toast(`Devocional concluído! +${XP_PER_DAY} XP`); }
    if (a === 'undo') { setDone(selected, false); rerender('[data-devo="done"]'); }
    if (a === 'usesug') { const s = suggestion(selected); if (s) { save(selected, { ref: s.ref }); rerender('.ref-field input'); } }
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset.field) {
      save(selected, { [t.dataset.field]: t.value });
      refreshChip(selected);
      flashSaved();
    } else if (t.dataset.plan) {
      const k = t.dataset.plan;
      save(k, { ref: t.value });
      refreshChip(k);
      if (k === selected) {
        const refInput = document.querySelector('.ref-field input');
        if (refInput) refInput.value = t.value;
      }
    }
  }

  // Ao abrir a tela pelo menu, volta para hoje (ou para o dia pedido pelo calendário).
  let pendingDay = null;
  function onEnter() { selected = pendingDay || todayKey(); pendingDay = null; }
  function openDay(k) { pendingDay = k; location.hash = '#/devocional'; }

  return { render, onClick, onInput, onEnter, openDay, streak, entry, todayKey, ensurePlan, suggestion };
})();

PAGES.devocional = {
  ...PAGES.devocional,
  sub: 'sua leitura e reflexão de cada dia',
  render: Devo.render,
  onClick: Devo.onClick,
  onInput: Devo.onInput,
  onEnter: Devo.onEnter,
};
