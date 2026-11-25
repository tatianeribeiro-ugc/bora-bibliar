-- Bora Bibliar · banco de dados (Supabase)
-- Rodar UMA vez no Supabase: menu SQL Editor → New query → colar tudo → Run.
--
-- Regras:
--  * Só entra quem teve o e-mail liberado pela administração (tabela allowed_emails).
--  * Dados pessoais (devocional, agenda, desafios, leitura, XP) ficam em user_state: só a própria pessoa lê.
--    A administração NÃO vê o que cada um escreve.
--  * Livros, avisos, link do grupo etc. só aparecem para quem está logado.
--  * Publicação anônima no mural: o nome nunca sai do servidor.

create extension if not exists unaccent;

-- ============ E-mails liberados (cadastro só com convite) ============
create table if not exists public.allowed_emails (
  email text primary key check (email = lower(email)),
  admin boolean not null default false,
  added_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;

-- ============ Perfis ============
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  church text not null default '',
  bio text not null default '',
  role text not null default 'member' check (role in ('member', 'admin')),
  -- placar do ranking (atualizado pelo app da própria pessoa)
  xp_total int not null default 0,
  xp_month int not null default 0,
  ch_total int not null default 0,
  ch_month int not null default 0,
  month_key text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "perfis visíveis" on public.profiles for select to authenticated using (true);
create policy "edita o próprio" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- ninguém se promove a admin pelo app
revoke update on public.profiles from authenticated;
grant update (name, church, bio, xp_total, xp_month, ch_total, ch_month, month_key) on public.profiles to authenticated;

create policy "admin vê e-mails" on public.allowed_emails for select to authenticated using (public.is_admin());
create policy "admin libera" on public.allowed_emails for insert to authenticated with check (public.is_admin());
create policy "admin remove" on public.allowed_emails for delete to authenticated using (public.is_admin());

-- Bloqueia cadastro de e-mail não liberado (vale mesmo fora do app).
create or replace function public.check_allowed_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'EMAIL_NAO_LIBERADO';
  end if;
  return new;
end $$;
drop trigger if exists check_allowed_email on auth.users;
create trigger check_allowed_email before insert on auth.users
  for each row execute function public.check_allowed_email();

-- Cria o perfil assim que a conta nasce (admin se o e-mail foi liberado como admin).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when exists (select 1 from public.allowed_emails where email = lower(new.email) and admin) then 'admin' else 'member' end
  );
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lista de membros para a administração (e-mail liberado + se já criou a conta).
create or replace function public.lista_membros()
returns table (email text, admin boolean, added_at timestamptz, cadastrado boolean, nome text)
language sql stable security definer set search_path = public as $$
  select a.email, a.admin, a.added_at, (u.id is not null), coalesce(p.name, '')
  from public.allowed_emails a
  left join auth.users u on lower(u.email) = a.email
  left join public.profiles p on p.id = u.id
  where public.is_admin()
  order by a.added_at desc;
$$;
revoke all on function public.lista_membros() from public, anon;
grant execute on function public.lista_membros() to authenticated;

-- ============ Dados pessoais (privados) ============
create table if not exists public.user_state (
  user_id uuid primary key default auth.uid() references public.profiles on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "só o dono" on public.user_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ Configurações do hub (link do grupo etc.) ============
create table if not exists public.settings (
  key text primary key,
  value text not null default ''
);
alter table public.settings enable row level security;
create policy "logados leem" on public.settings for select to authenticated using (true);
create policy "admin edita" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ Avisos da comunidade (calendário / God Hour) ============
create table if not exists public.announcements (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  time text not null default '',
  title text not null,
  notes text not null default '',
  kind text not null default 'aviso' check (kind in ('encontro', 'oracao', 'aviso')),
  link text not null default '' check (link = '' or link ~* '^https://'),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "logados leem" on public.announcements for select to authenticated using (true);
create policy "admin gerencia" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Palavra-chave de presença: só a administração lê. Vale 48h a partir de set_at.
create table if not exists public.encontro_keywords (
  announcement_id text primary key references public.announcements on delete cascade,
  keyword text not null,
  set_at timestamptz not null default now()
);
create or replace function public.reset_keyword_time() returns trigger language plpgsql as $$
begin
  if new.keyword is distinct from old.keyword then new.set_at := now(); else new.set_at := old.set_at; end if;
  return new;
end $$;
drop trigger if exists keyword_time on public.encontro_keywords;
create trigger keyword_time before update on public.encontro_keywords
  for each row execute function public.reset_keyword_time();
alter table public.encontro_keywords enable row level security;
create policy "só admin" on public.encontro_keywords for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Todos sabem SE a presença está aberta e desde quando, mas nunca a palavra.
create or replace function public.encontros_abertos()
returns table (announcement_id text, set_at timestamptz)
language sql stable security definer set search_path = public as $$
  select announcement_id, set_at from public.encontro_keywords where auth.uid() is not null;
$$;
revoke all on function public.encontros_abertos() from public, anon;
grant execute on function public.encontros_abertos() to authenticated;

create table if not exists public.attendance (
  user_id uuid not null references public.profiles on delete cascade,
  announcement_id text not null references public.announcements on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
alter table public.attendance enable row level security;
create policy "vê a própria presença" on public.attendance for select to authenticated using (user_id = auth.uid());
-- sem insert direto: presença só entra pela função abaixo

create or replace function public.marcar_presenca(p_announcement text, p_keyword text)
returns text language plpgsql security definer set search_path = public as $$
declare k record;
begin
  if auth.uid() is null then return 'erro'; end if;
  select * into k from public.encontro_keywords where announcement_id = p_announcement;
  if not found then return 'fechada'; end if;
  if k.set_at < now() - interval '48 hours' then return 'expirou'; end if;
  if lower(unaccent(trim(k.keyword))) <> lower(unaccent(trim(p_keyword))) then return 'errada'; end if;
  insert into public.attendance (user_id, announcement_id) values (auth.uid(), p_announcement)
  on conflict do nothing;
  return 'ok';
end $$;
revoke all on function public.marcar_presenca(text, text) from public, anon;
grant execute on function public.marcar_presenca(text, text) to authenticated;

-- ============ Biblioteca ============
create table if not exists public.books (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  author text not null default '',
  link text not null default '' check (link = '' or link ~* '^https://'),
  color text not null default 'navy',
  position int not null default 0
);
alter table public.books enable row level security;
create policy "logados leem" on public.books for select to authenticated using (true);
create policy "admin gerencia" on public.books for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.reviews (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  book_id text not null references public.books on delete cascade,
  text text not null check (char_length(text) between 10 and 2000),
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "vê as suas" on public.reviews for select to authenticated using (user_id = auth.uid());
create policy "publica a sua" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "exclui a sua ou admin" on public.reviews for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create table if not exists public.review_likes (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  review_id text not null references public.reviews on delete cascade,
  primary key (user_id, review_id)
);
alter table public.review_likes enable row level security;
create policy "curte como si" on public.review_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace view public.reviews_public as
select r.id, r.book_id, r.text, r.rating, r.created_at, p.name as author,
       (r.user_id = auth.uid()) as mine,
       (select count(*) from public.review_likes l where l.review_id = r.id)::int as likes,
       exists (select 1 from public.review_likes l where l.review_id = r.id and l.user_id = auth.uid()) as liked
from public.reviews r join public.profiles p on p.id = r.user_id
where auth.uid() is not null;
revoke all on public.reviews_public from anon;
grant select on public.reviews_public to authenticated;

-- ============ Comunidade: pedidos de oração e testemunhos ============
create table if not exists public.wall_posts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  kind text not null check (kind in ('oracao', 'testemunho')),
  text text not null check (char_length(text) between 5 and 1000),
  anonymous boolean not null default false,
  answered boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.wall_posts enable row level security;
create policy "vê as suas" on public.wall_posts for select to authenticated using (user_id = auth.uid());
create policy "publica a sua" on public.wall_posts for insert to authenticated with check (user_id = auth.uid());
create policy "marca respondida" on public.wall_posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exclui a sua ou admin" on public.wall_posts for delete to authenticated using (user_id = auth.uid() or public.is_admin());
revoke update on public.wall_posts from authenticated;
grant update (answered) on public.wall_posts to authenticated;

create table if not exists public.wall_reactions (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  post_id text not null references public.wall_posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.wall_reactions enable row level security;
create policy "reage como si" on public.wall_reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- O mural: mostra o texto de todos, mas o nome só quando NÃO é anônimo (e nunca o user_id).
create or replace view public.mural as
select w.id, w.kind, w.text, w.anonymous, w.answered, w.created_at,
       case when w.anonymous then null else p.name end as author,
       (w.user_id = auth.uid()) as mine,
       (select count(*) from public.wall_reactions r where r.post_id = w.id)::int as reactions,
       exists (select 1 from public.wall_reactions r where r.post_id = w.id and r.user_id = auth.uid()) as reacted
from public.wall_posts w join public.profiles p on p.id = w.user_id
where auth.uid() is not null;
revoke all on public.mural from anon;
grant select on public.mural to authenticated;

-- ============ Exclusões (dono ou administração) ============
-- Feitas por função no servidor para a administração poder moderar
-- sem enxergar quem publicou (importante nos pedidos anônimos).
create or replace function public.excluir_post(p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from public.wall_posts where id = p_id and (user_id = auth.uid() or public.is_admin());
  return found;
end $$;
create or replace function public.excluir_resenha(p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from public.reviews where id = p_id and (user_id = auth.uid() or public.is_admin());
  return found;
end $$;
revoke all on function public.excluir_post(text) from public, anon;
revoke all on function public.excluir_resenha(text) from public, anon;
grant execute on function public.excluir_post(text) to authenticated;
grant execute on function public.excluir_resenha(text) to authenticated;
