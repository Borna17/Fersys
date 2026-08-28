alter table public.work_orders
  add column if not exists weather_temperature_c numeric(5,2),
  add column if not exists weather_condition text,
  add column if not exists weather_humidity_pct smallint,
  add column if not exists weather_wind_kmh numeric(6,2),
  add column if not exists weather_recorded_at timestamptz,
  add column if not exists weather_latitude numeric(9,6),
  add column if not exists weather_longitude numeric(9,6),
  add column if not exists weather_source text;

alter table public.work_orders
  drop constraint if exists work_orders_weather_humidity_pct_check;

alter table public.work_orders
  add constraint work_orders_weather_humidity_pct_check
  check (
    weather_humidity_pct is null or
    weather_humidity_pct between 0 and 100
  );

comment on column public.work_orders.weather_temperature_c is
  'Temperature captured at the work location when the work order was created.';
comment on column public.work_orders.weather_recorded_at is
  'Timestamp of the immutable weather snapshot attached to the work order.';
