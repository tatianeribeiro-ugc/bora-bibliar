// Nuvem (Supabase): login, carregar os dados da conta e salvar cada mudança.
// As telas continuam usando Store.get / Store.set: este módulo escuta cada Store.set
// e manda só o que mudou para o banco (ver supabase/schema.sql).

const Cloud = (() => {
  const cfg = window.BB_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseKey);
  const PERSONAL = ['devotionals', 'devoPlan', 'events', 'tags', 'challenges', 'bibleBooks', 'reading', 'xp'];
  const SHARED = ['books', 'announcements', 'encontroKeys', 'reviews', 'reviewLikes', 'wall', 'wallReacts', 'settings'];
  let sb = null;
  let user = null;
  let snap = {}; // última versão já salva de cada coleção compartilhada
  let muted = false; // true enquanto o próprio Cloud atualiza o Store
  let chain = Promise.resolve();
  let personalTimer = null;
  let lastRefresh = 0;

  const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
  const monthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  const fail = (err) => {
    console.error('[Bora Bibliar] erro ao salvar', err);
    toast('⚠️ Não consegui salvar. Confira sua internet e tente de novo.');
  };
  const enqueue = (fn) => { chain = chain.then(fn).catch(fail); return chain; };

  // ================= login =================
  let authMode = 'login';
  let authDone = null;
  let authMsg = '';

  function authHtml() {
    const m = authMode;
    const title = { login: 'Entrar', signup: 'Primeiro acesso', forgot: 'Esqueci minha senha', newpass: 'Criar nova senha' }[m];
    const lead = {
      login: 'Que bom ter você aqui! Entre com seu e-mail e senha.',
      signup: 'Use o e-mail que foi liberado pela administração e crie a sua senha.',
      forgot: 'Digite seu e-mail. Vamos te mandar um link pra criar uma senha nova.',
      newpass: 'Digite sua nova senha.',
    }[m];
    const f = (name, label, type = 'text', extra = '') => `<label class="fld">${label}<input name="${name}" type="${type}" ${extra} /></label>`;
    return `<div class="auth-card" role="dialog" aria-labelledby="authTitle">
      <div class="auth-brand"><span class="brand-mark">${icon('bookOpen', 22)}</span>
        <span class="brand-text"><strong>Bora Bibliar</strong><small>Christian Hub</small></span></div>
      <h1 id="authTitle">${title}</h1>
      <p class="auth-lead">${lead}</p>
      <form class="auth-form" data-auth="${m}" novalidate>
        ${m === 'signup' ? f('name', 'Seu nome', 'text', 'autocomplete="name" maxlength="60" required') : ''}
        ${m !== 'newpass' ? f('email', 'E-mail', 'email', 'autocomplete="email" required') : ''}
        ${m === 'login' ? f('password', 'Senha', 'password', 'autocomplete="current-password" required') : ''}
        ${m === 'signup' || m === 'newpass' ? f('password', 'Crie uma senha <small>(mínimo 6 caracteres)</small>', 'password', 'autocomplete="new-password" minlength="6" required') + f('password2', 'Repita a senha', 'password', 'autocomplete="new-password" required') : ''}
        <p class="form-err" role="alert">${esc(authMsg)}</p>
        <button class="btn btn-navy" type="submit">${{ login: 'entrar', signup: 'criar minha conta', forgot: 'enviar link', newpass: 'salvar nova senha' }[m]}</button>
      </form>
      <div class="auth-links">
        ${m === 'login' ? `<button type="button" data-auth-go="signup">primeiro acesso? <b>criar minha senha</b></button>
          <button type="button" data-auth-go="forgot">esqueci minha senha</button>` : ''}
        ${m === 'signup' || m === 'forgot' ? '<button type="button" data-auth-go="login">já tenho conta: <b>entrar</b></button>' : ''}
      </div>
    </div>`;
  }

  function showAuth(mode, msg = '') {
    authMode = mode; authMsg = msg;
    let el = document.getElementById('auth');
    if (!el) {
      el = document.createElement('div');
      el.id = 'auth';
      el.className = 'auth';
      document.body.appendChild(el);
      el.addEventListener('click', (e) => {
        const go = e.target.closest('[data-auth-go]');
        if (go) showAuth(go.dataset.authGo);
      });
      el.addEventListener('submit', onAuthSubmit);
    }
    el.innerHTML = authHtml();
    document.body.classList.add('auth-open');
    el.querySelector('input')?.focus();
  }
  function hideAuth() {
    document.getElementById('auth')?.remove();
    document.body.classList.remove('auth-open');
  }

  function authError(err) {
    const t = `${err?.message || err || ''}`;
    if (/EMAIL_NAO_LIBERADO|Database error saving new user/i.test(t)) return 'Esse e-mail ainda não foi liberado. Fale com a administração do Bora Bibliar. 💛';
    if (/already registered|already been registered/i.test(t)) return 'Esse e-mail já tem conta. Volte e clique em “entrar”.';
    if (/Invalid login credentials/i.test(t)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(t)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    if (/rate limit|too many/i.test(t)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
    if (/Password should be/i.test(t)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/fetch|network/i.test(t)) return 'Sem conexão com a internet. Confira e tente de novo.';
    return 'Não deu certo: ' + t;
  }

  async function onAuthSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const v = (n) => (form.elements[n]?.value || '').trim();
    const err = (m) => { form.querySelector('.form-err').textContent = m; };
    const btn = form.querySelector('button[type="submit"]');
    const mode = form.dataset.auth;
    const email = v('email').toLowerCase();
    if (mode !== 'newpass' && !/^\S+@\S+\.\S+$/.test(email)) return err('Digite um e-mail válido.');
    if (mode === 'signup' && !v('name')) return err('Digite seu nome.');
    if ((mode === 'signup' || mode === 'newpass')) {
      if (v('password').length < 6) return err('A senha precisa ter pelo menos 6 caracteres.');
      if (v('password') !== v('password2')) return err('As duas senhas não estão iguais.');
    }
    btn.disabled = true; err('');
    try {
      if (mode === 'login') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: form.elements.password.value });
        if (error) throw error;
        user = data.user; authDone?.();
      } else if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password: form.elements.password.value, options: { data: { name: v('name') } } });
        if (error) throw error;
        if (data.session) { user = data.user; authDone?.(); }
        else showAuth('login', 'Conta criada! Confirme pelo link que enviamos pro seu e-mail e depois entre aqui.');
      } else if (mode === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        showAuth('login', 'Se esse e-mail tiver conta, enviamos um link pra criar uma senha nova. Confira sua caixa de entrada (e o spam).');
      } else if (mode === 'newpass') {
        const { data, error } = await sb.auth.updateUser({ password: form.elements.password.value });
        if (error) throw error;
        user = data.user; toast('Senha nova salva! 🔐'); authDone?.();
      }
    } catch (ex) {
      err(authError(ex));
    } finally {
      if (form.isConnected) btn.disabled = false;
    }
  }

  // ================= carregar =================
  function shapeShared(r) {
    const isAdm = r.profile.role === 'admin';
    return {
      books: r.books.map((b) => ({ id: b.id, title: b.title, author: b.author, link: b.link, color: b.color })),
      announcements: r.anns.map((a) => ({ id: a.id, date: a.date, time: a.time || '', title: a.title, notes: a.notes || '', kind: a.kind, link: a.link || '' })),
      encontroKeys: Object.fromEntries(r.kws.map((k) => [k.announcement_id, { word: isAdm ? k.keyword : null, at: k.set_at }])),
      attendance: Object.fromEntries(r.att.map((a) => [a.announcement_id, a.created_at])),
      reviews: r.revs.map((x) => ({ id: x.id, bookId: x.book_id, text: x.text, at: x.created_at, author: x.author || '', mine: x.mine, rating: x.rating, likes: x.likes - (x.liked ? 1 : 0) })),
      reviewLikes: Object.fromEntries(r.revs.filter((x) => x.liked).map((x) => [x.id, true])),
      wall: r.wall.map((p) => ({ id: p.id, kind: p.kind, text: p.text, anon: p.anonymous, author: p.author || '', at: p.created_at, answered: p.answered, mine: p.mine, reacts: p.reactions - (p.reacted ? 1 : 0) })),
      wallReacts: Object.fromEntries(r.wall.filter((p) => p.reacted).map((p) => [p.id, true])),
      settings: Object.fromEntries(r.settings.map((s) => [s.key, s.value])),
      community: r.community,
    };
  }

  async function fetchShared(profile) {
    const [books, anns, att, revs, wall, settings, community] = await Promise.all([
      q(sb.from('books').select('*').order('position')),
      q(sb.from('announcements').select('*')),
      q(sb.from('attendance').select('announcement_id, created_at')),
      q(sb.from('reviews_public').select('*')),
      q(sb.from('mural').select('*')),
      q(sb.from('settings').select('*')),
      q(sb.from('profiles').select('id, name, xp_total, xp_month, ch_total, ch_month, month_key')),
    ]);
    const kws = profile.role === 'admin'
      ? await q(sb.from('encontro_keywords').select('*'))
      : await q(sb.rpc('encontros_abertos'));
    return shapeShared({ profile, books, anns, att, revs, wall, settings, community, kws });
  }

  async function loadAll() {
    const prof = await q(sb.from('profiles').select('*').eq('id', user.id).single());
    const st = await q(sb.from('user_state').select('data').eq('user_id', user.id).maybeSingle());
    const profile = { name: prof.name, church: prof.church, bio: prof.bio, role: prof.role };
    let personal = st?.data || null;
    let migrated = false;
    if (!personal) {
      // primeiro acesso: traz o que já existia neste navegador (devocionais, agenda, XP...)
      const local = Store.localData();
      const has = Object.keys(local.devotionals || {}).length || (local.xp || []).length || (local.events || []).length;
      personal = {};
      if (has) {
        PERSONAL.forEach((k) => { personal[k] = local[k]; });
        if (!profile.name && local.profile?.name) profile.name = local.profile.name;
        migrated = true;
      }
    }
    const shared = await fetchShared(profile);
    Store.useCloud({ ...personal, profile, ...shared }, onSet);
    snap = Object.fromEntries(SHARED.map((k) => [k, clone(Store.get(k))]));
    snap.profile = clone(profile);
    lastRefresh = Date.now();
    if (!st) {
      await q(sb.from('user_state').upsert({ user_id: user.id, data: pickPersonal() }));
      if (migrated) {
        if (profile.name !== prof.name) await q(sb.from('profiles').update({ name: profile.name }).eq('id', user.id));
        pushScore();
        setTimeout(() => toast('Trouxemos seus dados deste navegador pra sua conta. ✨'), 600);
      }
    }
  }

  // ================= salvar =================
  const pickPersonal = () => Object.fromEntries(PERSONAL.map((k) => [k, Store.get(k)]));

  function savePersonalNow() {
    clearTimeout(personalTimer); personalTimer = null;
    const data = pickPersonal();
    return enqueue(() => q(sb.from('user_state').upsert({ user_id: user.id, data, updated_at: new Date().toISOString() })));
  }
  function pushScore() {
    const mk = monthKey();
    const xp = Store.get('xp') || [];
    const inMonth = xp.filter((x) => (x.at || '').slice(0, 7) === mk);
    const row = {
      xp_total: xp.reduce((s, x) => s + (x.points || 0), 0),
      xp_month: inMonth.reduce((s, x) => s + (x.points || 0), 0),
      ch_total: xp.filter((x) => x.action === 'desafio').length,
      ch_month: inMonth.filter((x) => x.action === 'desafio').length,
      month_key: mk,
    };
    return enqueue(() => q(sb.from('profiles').update(row).eq('id', user.id)));
  }

  function diffList(prev, next) {
    const p = new Map((prev || []).map((x, i) => [x.id, { x, i }]));
    const n = new Map((next || []).map((x, i) => [x.id, { x, i }]));
    return {
      added: [...n.values()].filter(({ x }) => !p.has(x.id)),
      changed: [...n.values()].filter(({ x, i }) => p.has(x.id) && (JSON.stringify(p.get(x.id).x) !== JSON.stringify(x) || p.get(x.id).i !== i)),
      removed: [...p.values()].filter(({ x }) => !n.has(x.id)).map(({ x }) => x),
    };
  }
  function diffMap(prev, next) {
    const pk = Object.keys(prev || {}), nk = Object.keys(next || {});
    return {
      added: nk.filter((k) => !(k in (prev || {}))),
      changed: nk.filter((k) => k in (prev || {}) && JSON.stringify(prev[k]) !== JSON.stringify(next[k])),
      removed: pk.filter((k) => !(k in (next || {}))),
    };
  }

  const SYNC = {
    async books(prev, next) {
      const d = diffList(prev, next);
      const rows = [...d.added, ...d.changed].map(({ x, i }) => ({ id: x.id, title: x.title, author: x.author || '', link: x.link || '', color: x.color || 'navy', position: i }));
      if (rows.length) await q(sb.from('books').upsert(rows));
      if (d.removed.length) await q(sb.from('books').delete().in('id', d.removed.map((x) => x.id)));
    },
    async announcements(prev, next) {
      const d = diffList(prev, next);
      const rows = [...d.added, ...d.changed].map(({ x }) => ({ id: x.id, date: x.date, time: x.time || '', title: x.title, notes: x.notes || '', kind: x.kind || 'aviso', link: x.link || '' }));
      if (rows.length) await q(sb.from('announcements').upsert(rows));
      if (d.removed.length) await q(sb.from('announcements').delete().in('id', d.removed.map((x) => x.id)));
    },
    async encontroKeys(prev, next) {
      const word = (v) => (typeof v === 'string' ? v : v?.word);
      const d = diffMap(prev, next);
      const rows = [...d.added, ...d.changed.filter((k) => word(prev[k]) !== word(next[k]))]
        .filter((k) => word(next[k])).map((k) => ({ announcement_id: k, keyword: word(next[k]) }));
      if (rows.length) await q(sb.from('encontro_keywords').upsert(rows));
      if (d.removed.length) await q(sb.from('encontro_keywords').delete().in('announcement_id', d.removed));
    },
    async reviews(prev, next) {
      const d = diffList(prev, next);
      const reading = Store.get('reading') || {};
      for (const { x } of d.added) {
        await q(sb.from('reviews').insert({ id: x.id, book_id: x.bookId, text: x.text, rating: reading[x.bookId]?.rating || null }));
      }
      for (const x of d.removed) await q(sb.rpc('excluir_resenha', { p_id: x.id }));
    },
    async reviewLikes(prev, next) {
      const d = diffMap(prev, next);
      if (d.added.length) await q(sb.from('review_likes').insert(d.added.map((id) => ({ review_id: id }))));
      if (d.removed.length) await q(sb.from('review_likes').delete().eq('user_id', user.id).in('review_id', d.removed));
    },
    async wall(prev, next) {
      const d = diffList(prev, next);
      for (const { x } of d.added) await q(sb.from('wall_posts').insert({ id: x.id, kind: x.kind, text: x.text, anonymous: !!x.anon }));
      for (const { x } of d.changed) {
        const old = (prev || []).find((p) => p.id === x.id);
        if (x.mine && !!old?.answered !== !!x.answered) await q(sb.from('wall_posts').update({ answered: !!x.answered }).eq('id', x.id));
      }
      for (const x of d.removed) await q(sb.rpc('excluir_post', { p_id: x.id }));
    },
    async wallReacts(prev, next) {
      const d = diffMap(prev, next);
      if (d.added.length) await q(sb.from('wall_reactions').insert(d.added.map((id) => ({ post_id: id }))));
      if (d.removed.length) await q(sb.from('wall_reactions').delete().eq('user_id', user.id).in('post_id', d.removed));
    },
    async settings(prev, next) {
      const d = diffMap(prev, next);
      const rows = [...d.added, ...d.changed].map((k) => ({ key: k, value: next[k] || '' }));
      if (rows.length) await q(sb.from('settings').upsert(rows));
      if (d.removed.length) await q(sb.from('settings').delete().in('key', d.removed));
    },
  };

  function onSet(key) {
    if (muted) return;
    if (PERSONAL.includes(key)) {
      clearTimeout(personalTimer);
      personalTimer = setTimeout(savePersonalNow, 800);
      if (key === 'xp') pushScore();
      return;
    }
    if (key === 'profile') {
      const p = Store.get('profile');
      enqueue(() => q(sb.from('profiles').update({ name: p.name || '', church: p.church || '', bio: p.bio || '' }).eq('id', user.id)));
      return;
    }
    if (SYNC[key]) {
      const prev = snap[key];
      const next = clone(Store.get(key));
      snap[key] = next;
      enqueue(() => SYNC[key](prev, next).catch((err) => { snap[key] = prev; throw err; }));
    }
  }

  // Busca de novo o que é da comunidade (novos pedidos, avisos, livros...) ao trocar de tela.
  async function refreshShared(force) {
    if (!user || (!force && Date.now() - lastRefresh < 20000)) return false;
    lastRefresh = Date.now();
    try {
      await chain; // espera os envios pendentes
      const shared = await fetchShared(Store.get('profile'));
      muted = true;
      Object.entries(shared).forEach(([k, v]) => Store.set(k, v));
      muted = false;
      SHARED.forEach((k) => { snap[k] = clone(Store.get(k)); });
      return true;
    } catch (err) {
      muted = false;
      console.warn('[Bora Bibliar] não deu pra atualizar', err);
      return false;
    }
  }

  // ================= início =================
  async function start() {
    if (!window.supabase) {
      // sem internet (a biblioteca do Supabase não carregou)
      showAuth('login');
      document.querySelector('#auth .auth-card').innerHTML = `<h1>Sem conexão 📡</h1><p class="auth-lead">O Bora Bibliar precisa de internet pra abrir sua conta. Confira a conexão e tente de novo.</p><button class="btn btn-navy" onclick="location.reload()">tentar de novo</button>`;
      return new Promise(() => {});
    }
    const recovery = /type=recovery/.test(location.hash);
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    document.body.classList.add('booting');
    const { data } = await sb.auth.getSession();
    if (data.session && !recovery) {
      user = data.session.user;
    } else {
      document.body.classList.remove('booting');
      await new Promise((res) => { authDone = res; showAuth(recovery ? 'newpass' : 'login'); });
    }
    document.body.classList.add('booting');
    if (/access_token|type=/.test(location.hash)) history.replaceState(null, '', location.pathname + '#/dashboard');
    try {
      await loadAll();
    } catch (err) {
      console.error(err);
      document.body.classList.remove('booting');
      showAuth('login', 'Não consegui carregar seus dados. Confira a internet e entre de novo.');
      await new Promise((res) => { authDone = res; });
      return start();
    }
    hideAuth();
    document.body.classList.remove('booting');
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') location.reload(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && personalTimer) savePersonalNow();
    });
  }

  async function signOut() {
    if (personalTimer) await savePersonalNow();
    await chain;
    await sb.auth.signOut();
    location.reload();
  }

  // ================= presença e membros =================
  const attend = async (id, word) => q(sb.rpc('marcar_presenca', { p_announcement: id, p_keyword: word }));
  const members = async () => q(sb.rpc('lista_membros'));
  const allow = async (email) => q(sb.from('allowed_emails').insert({ email: email.toLowerCase().trim() }));
  const disallow = async (email) => q(sb.from('allowed_emails').delete().eq('email', email));

  return {
    enabled, start, signOut, refreshShared, attend, members, allow, disallow,
    userId: () => user?.id || null,
    email: () => user?.email || '',
    monthKey,
  };
})();
