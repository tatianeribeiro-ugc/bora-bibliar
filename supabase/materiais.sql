-- Materiais e PDFs: rode UMA vez no SQL Editor do Supabase (depois do schema.sql).
-- Os arquivos ficam num bucket PRIVADO: só quem está logado no Hub lê e baixa; só a administração envia e remove.

create table if not exists public.materials (
  id text primary key,
  title text not null,
  description text not null default '',
  path text not null,
  size bigint not null default 0,
  created_at timestamptz not null default now()
);
alter table public.materials enable row level security;
drop policy if exists "logados leem" on public.materials;
drop policy if exists "admin gerencia" on public.materials;
create policy "logados leem" on public.materials for select to authenticated using (true);
create policy "admin gerencia" on public.materials for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiais', 'materiais', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "logados baixam materiais" on storage.objects;
drop policy if exists "admin envia materiais" on storage.objects;
drop policy if exists "admin apaga materiais" on storage.objects;
create policy "logados baixam materiais" on storage.objects for select to authenticated using (bucket_id = 'materiais');
create policy "admin envia materiais" on storage.objects for insert to authenticated with check (bucket_id = 'materiais' and public.is_admin());
create policy "admin apaga materiais" on storage.objects for delete to authenticated using (bucket_id = 'materiais' and public.is_admin());
