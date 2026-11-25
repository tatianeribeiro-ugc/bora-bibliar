# Bora Bibliar · Christian Hub

Hub cristão para estudar a Bíblia em comunidade: devocional diário, calendário bíblico,
biblioteca, desafios com XP e ranking, mural de oração e testemunhos e encontros God Hour.

Feito em HTML, CSS e JavaScript puros (sem build). Dados e login pelo [Supabase](https://supabase.com).

## Como funciona

- **Sem configuração** (`js/config.js` vazio): o app roda só no navegador (modo local).
- **Com Supabase** (`js/config.js` preenchido): login por e-mail e senha. Só cria conta quem
  tiver o e-mail liberado pela administração (Configurações → Membros liberados).

## Publicar uma atualização

1. Aumente `APP_VERSION` em `js/app.js` **e** `VERSION` em `sw.js`.
2. `git commit` e `git push`. O GitHub Pages publica sozinho em 1–2 minutos.

## Banco de dados

`supabase/schema.sql` cria tabelas, regras de acesso (RLS) e funções. Rodar uma vez no SQL Editor
do Supabase. A configuração inicial com dados privados (e-mail da administração, link do grupo,
estante inicial) fica num arquivo local que não vai para o GitHub.

## Estrutura

```
index.html            página única
css/styles.css        visual
js/config.js          conexão com o Supabase
js/store.js           dados (Store.get / Store.set)
js/cloud.js           login e sincronização com o Supabase
js/pages.js           menu, Dashboard, Perfil, Configurações
js/devocional.js      Meu devocional
js/calendario.js      Calendário bíblico + avisos + presença
js/biblioteca.js      Biblioteca, minha leitura, resenhas
js/desafios.js        níveis, medalhas, desafios, ranking
js/comunidade.js      pedidos de oração e testemunhos
js/embreve.js         Plano de estudos, Materiais, Jogos, God Hour
js/membros.js         membros liberados (administração)
sw.js                 app instalável / offline
```
