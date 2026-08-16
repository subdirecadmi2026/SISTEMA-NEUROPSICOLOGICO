alter table public.organizations
  add column brand_name text not null default 'NeuroSys',
  add column brand_tagline text not null default 'Clinical ERP',
  add constraint organizations_brand_name_length
    check (char_length(trim(brand_name)) between 2 and 40),
  add constraint organizations_brand_tagline_length
    check (char_length(trim(brand_tagline)) between 2 and 40);

comment on column public.organizations.brand_name is
  'Nombre personalizable de la plataforma para la organización.';

comment on column public.organizations.brand_tagline is
  'Descripción corta personalizable mostrada junto a la marca.';
