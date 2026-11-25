# Bora Bibliar

Community hub para estudar, fazer devocional, ler, jogar e crescer junto.

## Rodar no computador
O app precisa ser aberto por um servidor local (abrir o `index.html` direto funciona, mas sem o modo instalável/offline).

- **VS Code:** instale a extensão *Live Server*, clique com o botão direito no `index.html` → *Open with Live Server*.

## Estrutura
| Arquivo | O que é |
|---|---|
| `js/pages.js` | Menu lateral (`NAV`) e as telas (`PAGES`). Módulo novo começa aqui. |
| `js/store.js` | Onde os dados são salvos. Hoje no navegador; depois, Supabase. |
| `js/app.js` | Rotas, menu no celular, backup, atualizações. |
| `css/styles.css` | Cores e visual (paleta no topo). |
| `sw.js` | Modo app instalável/offline. |
| `supabase/schema.sql` | Banco para a fase multiusuário (ainda não usado). |

## Publicar uma nova versão
Aumente `APP_VERSION` em `js/app.js` **e** `VERSION` em `sw.js`.
