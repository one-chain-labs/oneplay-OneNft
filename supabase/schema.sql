-- Supabase schema for dynamic Anime NFT marketplace
-- Run this script in the Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists public.nfts (
  id uuid primary key default gen_random_uuid(),
  nft_object_id text unique not null,
  name text not null,
  description text,
  image_url text,
  category text,
  rarity text,
  series text,
  character text,
  manufacturer text,
  release_year int,
  creator_address text not null,
  owner_address text not null,
  status text not null default 'minted',
  price_oct numeric,
  listing_price_oct numeric,
  listing_id text,
  mint_tx_digest text,
  list_tx_digest text,
  purchase_tx_digest text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nft_transactions (
  id uuid primary key default gen_random_uuid(),
  nft_object_id text not null references public.nfts (nft_object_id) on delete cascade,
  type text not null,
  tx_digest text not null,
  actor_address text not null,
  price_oct numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_nfts_status on public.nfts (status);
create index if not exists idx_nfts_owner on public.nfts (owner_address);
create index if not exists idx_nfts_listing_id on public.nfts (listing_id);
create index if not exists idx_transactions_nft on public.nft_transactions (nft_object_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_nfts_updated_at on public.nfts;
create trigger set_nfts_updated_at
before update on public.nfts
for each row
execute procedure public.set_updated_at();

