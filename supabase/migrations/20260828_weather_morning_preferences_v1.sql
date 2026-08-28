alter table public.profiles add column if not exists weather_city text;
alter table public.profiles add column if not exists weather_latitude double precision;
alter table public.profiles add column if not exists weather_longitude double precision;
alter table public.profiles add column if not exists weather_timezone text not null default 'Europe/Zagreb';
alter table public.profiles add column if not exists weather_morning_enabled boolean not null default true;
alter table public.profiles add column if not exists weather_morning_hour smallint not null default 6 check (weather_morning_hour between 0 and 23);
alter table public.profiles add column if not exists weather_last_sent_date date;
