// Camada de dados.
// Hoje: salva no navegador (localStorage), só pra você.
// Amanhã: quando o hub virar multiusuário, só este arquivo muda pra falar com o Supabase
// (ver supabase/schema.sql). As telas continuam chamando Store.get / Store.set.

const Store = (() => {
  const KEY = 'boraBibliar:v1';

  const blank = () => ({
    schema: 1,
    createdAt: new Date().toISOString(),
    // role: por enquanto só você usa, então é 'admin'. No multiusuário, quem decide é o Supabase.
    profile: { name: '', bio: '', church: '', role: 'admin' },
    xp: [], // { at, action, points } — base do ranking
    devotionals: {}, // { 'AAAA-MM-DD': { ref, resumo, ..., done } }
    events: [], // compromissos pessoais { id, date, time, title, notes, tagId }
    tags: [ // etiquetas pessoais, editáveis
      { id: 't-devocional', name: 'Devocional', color: 'gold' },
      { id: 't-estudo', name: 'Estudo', color: 'navy' },
      { id: 't-igreja', name: 'Igreja', color: 'lilac' },
      { id: 't-pessoal', name: 'Pessoal', color: 'rose' },
    ],
    challenges: {}, // desafios concluídos { id: dataISO }
    bibleBooks: {}, // livros da Bíblia lidos { 'Marcos': dataISO }
    attendance: {}, // presença em encontros ao vivo { idDoAviso: dataISO }
    books: [], // estante da Biblioteca (só admin edita) { id, title, author, link, color }
    reading: {}, // minha leitura { idDoLivro: { status: 'quero'|'lendo'|'concluido', rating, at } }
    reviews: [], // resenhas públicas { id, bookId, text, at, author }
    reviewLikes: {}, // resenhas que curti { idDaResenha: true }
    wall: [], // mural da Comunidade { id, kind: 'oracao'|'testemunho', text, anon, author, at, answered, mine }
    wallReacts: {}, // publicações em que orei / celebrei { idDaPublicacao: dataISO }
    settings: {}, // configurações do hub { whatsapp }
    community: null, // placar de todos (só no modo online) [{ id, name, xp_total, xp_month, ch_total, ch_month, month_key }]
    encontroKeys: {}, // palavra-chave de cada encontro (só admin) { idDoAviso: 'palavra' }
    announcements: [], // avisos da comunidade (só admin cria) { id, date, time, title, notes, kind, link }
  });

  let state = load();
  let cloud = false; // true = dados vêm do Supabase (não usa o armazenamento do navegador)
  let onChange = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...blank(), ...JSON.parse(raw) };
    } catch (e) { /* armazenamento indisponível: segue em memória */ }
    return blank();
  }

  function save() {
    if (cloud) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
  }

  return {
    get: (key) => state[key],
    set(key, value) { state[key] = value; save(); onChange?.(key, value); },
    // modo online: troca o estado inteiro pelos dados da conta e avisa a cada mudança
    useCloud(data, listener) { cloud = true; state = { ...blank(), ...data }; onChange = listener; },
    isCloud: () => cloud,
    snapshot: () => state,
    localData: () => load(),
    totalXp: () => state.xp.reduce((sum, e) => sum + (e.points || 0), 0),

    exportJson() {
      return JSON.stringify({ app: 'bora-bibliar', exportedAt: new Date().toISOString(), data: state }, null, 2);
    },
    importJson(text) {
      const parsed = JSON.parse(text);
      if (parsed.app !== 'bora-bibliar' || !parsed.data) throw new Error('Arquivo não é um backup do Bora Bibliar.');
      state = { ...blank(), ...parsed.data };
      save();
    },
    reset() { state = blank(); save(); },
  };
})();
