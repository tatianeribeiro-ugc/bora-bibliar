// Menu lateral e telas. Cada módulo novo começa aqui.

const NAV = [
  { section: null, items: ['dashboard'] },
  { section: 'Sua jornada', items: ['calendario', 'plano', 'devocional', 'biblioteca', 'materiais'] },
  { section: 'Interação', items: ['jogos', 'desafios', 'ranking', 'comunidade', 'encontros'] },
  { section: 'Minha conta', items: ['perfil', 'configuracoes'] },
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Tela "em construção" para módulos que ainda vão ganhar vida.
function comingSoon(intro, features) {
  return () => `
    <div class="card soon">
      <span class="pill">${icon('sparkle', 14)} em construção</span>
      <p class="lead">${intro}</p>
      <ul class="features">${features.map((f) => `<li>${f}</li>`).join('')}</ul>
    </div>`;
}

const PAGES = {
  dashboard: {
    label: 'Dashboard', icon: 'home', sub: 'seu dia no Bora Bibliar',
    render: () => {
      const p = Store.get('profile');
      const h = new Date().getHours();
      const hello = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
      const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      const shortcuts = ['devocional', 'plano', 'desafios', 'jogos', 'biblioteca', 'encontros'];
      return `
        <div class="hero">
          <div>
            <p class="eyebrow">${esc(today)}</p>
            <h2>${hello}${p.name ? ', ' + esc(p.name.split(' ')[0]) : ''}!</h2>
            <p>${Devo.entry(Devo.todayKey()).ref
              ? `Leitura de hoje: <strong>${esc(Devo.entry(Devo.todayKey()).ref)}</strong>`
              : 'Bora bibliar hoje? Escolha por onde começar.'}</p>
          </div>
          <a class="btn btn-gold" href="#/devocional">Meu devocional ${icon('arrowRight', 16)}</a>
        </div>

        <div class="stats">
          <div class="stat"><span class="stat-ico">${icon('star')}</span><strong>${Store.totalXp()}</strong><small>XP · ${Game.levelOf(Store.totalXp()).emoji} ${Game.levelOf(Store.totalXp()).name}</small></div>
          <div class="stat"><span class="stat-ico">${icon('flame')}</span><strong>${Devo.streak()}</strong><small>dias seguidos</small></div>
          <div class="stat"><span class="stat-ico">${icon('trophy')}</span><strong>${Game.doneCount()}</strong><small>desafios concluídos</small></div>
          <div class="stat"><span class="stat-ico">${icon('library')}</span><strong>${Library.booksRead()}</strong><small>livros lidos</small></div>
        </div>

        <h3 class="section-title">atalhos</h3>
        <div class="shortcuts">
          ${shortcuts.map((id) => `
            <a class="shortcut" href="#/${id}">
              <span class="shortcut-ico">${icon(PAGES[id].icon, 22)}</span>
              <span><strong>${PAGES[id].label}</strong><small>${PAGES[id].sub}</small></span>
            </a>`).join('')}
        </div>`;
    },
  },

  calendario: { label: 'Calendário bíblico', icon: 'calendar', sub: 'datas, festas e seus compromissos de fé',
    render: comingSoon('Um calendário pra organizar sua caminhada.', ['Datas importantes do ano cristão', 'Seus encontros e estudos marcados', 'Lembretes de devocional e leitura']) },
  plano: { label: 'Plano de estudos', icon: 'bookOpen', sub: 'trilhas de estudo com progresso',
    render: comingSoon('Estudos organizados em séries e lições.', ['Séries temáticas com lições', 'Vídeos, textos e perguntas de reflexão', 'Progresso por lição + XP ao concluir']) },
  devocional: { label: 'Meu devocional', icon: 'notebookPen', sub: 'seu momento diário',
    render: comingSoon('Seu caderno de devocional diário.', ['Reflexão do dia', 'Campo pra escrever o que Deus falou com você', 'Histórico e sequência de dias']) },
  biblioteca: { label: 'Biblioteca', icon: 'library', sub: 'livros pra ler e reler',
    render: comingSoon('Sua estante de livros cristãos.', ['Status: quero ler · lendo · lido', 'Anotações e citações favoritas', 'Clube do livro com a comunidade']) },
  materiais: { label: 'Materiais e PDFs', icon: 'fileText', sub: 'apostilas, mapas e recursos',
    render: comingSoon('Todos os materiais num lugar só.', ['Upload e download de PDFs', 'Organização por tema', 'Materiais ligados aos estudos']) },

  jogos: { label: 'Jogos & Quiz', icon: 'gamepad', sub: 'aprender brincando',
    render: comingSoon('Jogos pra fixar o que você estudou.', ['Quiz por tema e dificuldade', 'Complete a frase · quem disse isso', 'Pontos de XP por acerto']) },
  desafios: { label: 'Desafios', icon: 'trophy', sub: 'metas com começo, meio e fim',
    render: comingSoon('Desafios pra criar hábitos.', ['Ex.: 21 dias de oração, 30 dias de gratidão', 'Check-in diário', 'Medalha ao concluir']) },
  ranking: { label: 'Ranking', icon: 'medal', sub: 'XP da semana e do mês',
    render: comingSoon('Ranking da comunidade.', ['Ranking semanal, mensal e geral', 'XP vindo de devocionais, jogos e desafios', 'Premiações e medalhas']) },
  comunidade: { label: 'Comunidade', icon: 'users', sub: 'caminhar junto',
    render: comingSoon('Um espaço pra compartilhar.', ['Mural de testemunhos e pedidos de oração', 'Grupos de estudo', 'Ativo quando o hub abrir pra várias pessoas']) },
  encontros: { label: 'Encontros', icon: 'video', sub: 'lives e reuniões',
    render: comingSoon('Encontros ao vivo e gravados.', ['Agenda de lives e reuniões online', 'Link de acesso e lembrete', 'Gravações dos encontros passados']) },

  perfil: { label: 'Meu perfil', icon: 'user', sub: 'como você aparece no hub',
    render: () => {
      const p = Store.get('profile');
      return `
        <form class="card form" id="profileForm">
          <div class="profile-head">
            <span class="avatar big">${esc((p.name || 'B').trim().charAt(0).toUpperCase())}</span>
            <div><strong>${esc(p.name || 'Seu nome')}</strong><small>${Store.totalXp()} XP</small></div>
          </div>
          <label>Nome<input name="name" value="${esc(p.name)}" placeholder="Como quer ser chamada(o)?" maxlength="60" /></label>
          <label>Igreja / comunidade<input name="church" value="${esc(p.church)}" placeholder="Opcional" maxlength="80" /></label>
          <label>Sobre você<textarea name="bio" rows="3" placeholder="Uma frase sobre sua caminhada" maxlength="280">${esc(p.bio)}</textarea></label>
          <div class="actions"><button class="btn btn-navy" type="submit">Salvar perfil</button></div>
        </form>`;
    },
  },

  configuracoes: { label: 'Configurações', icon: 'settings', sub: 'personalize o seu hub',
    render: () => Store.isCloud() ? `
      <h3 class="section-title">sua conta</h3>
      <div class="card">
        <p class="muted">Você entrou como <strong>${esc(Cloud.email())}</strong>. Seus dados ficam salvos na sua conta e aparecem em qualquer aparelho em que você entrar.</p>
        <div class="actions">
          <button class="btn btn-soft" data-action="export">${icon('download', 16)} baixar cópia dos meus dados</button>
          <button class="btn btn-soft" data-action="import">${icon('upload', 16)} importar backup</button>
          <button class="btn btn-danger" data-action="logout">sair da conta</button>
        </div>
      </div>
      ${Store.get('profile').role === 'admin' ? '<div id="membersBox"></div>' : ''}
      ${versionCard()}` : `
      <h3 class="section-title">seus dados</h3>
      <div class="card">
        <p class="muted">Por enquanto tudo fica salvo neste navegador. Quando o hub abrir pra várias pessoas, cada uma terá sua conta na nuvem. Faça backups de vez em quando.</p>
        <div class="actions">
          <button class="btn btn-soft" data-action="export">${icon('download', 16)} exportar backup (.json)</button>
          <button class="btn btn-soft" data-action="import">${icon('upload', 16)} importar backup</button>
          <button class="btn btn-danger" data-action="reset">recomeçar do zero</button>
        </div>
      </div>
      ${versionCard()}` },
};

function versionCard() {
  return `

      <h3 class="section-title">versão &amp; atualizações</h3>
      <div class="card">
        <p class="muted">Você está na versão <strong>${APP_VERSION}</strong>. As atualizações chegam sozinhas, mas se o app parecer desatualizado (principalmente no Safari da tela inicial), toque aqui pra buscar a versão mais nova.</p>
        <div class="actions"><button class="btn btn-soft" data-action="update">${icon('refresh', 16)} buscar atualizações</button></div>
      </div>`;
}
