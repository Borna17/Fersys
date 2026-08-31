create or replace function public.assert_subscription_feature_for_company(
  requested_feature text,
  requested_company_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subscription public.company_subscriptions;
  v_plan public.plans;
  v_enabled boolean := false;
begin
  if auth.uid() is null then
    return;
  end if;

  if requested_company_id is distinct from public.current_company_id() then
    raise exception 'Nemate pristup traženoj tvrtki.';
  end if;

  select * into v_subscription
  from public.company_subscriptions
  where company_id = requested_company_id
  limit 1;

  if v_subscription.id is null then
    raise exception 'Pretplata tvrtke nije pronađena.';
  end if;

  select * into v_plan
  from public.plans
  where id = v_subscription.plan_id
  limit 1;

  if v_plan.id is null or not public.subscription_is_usable(v_subscription) then
    raise exception 'Pretplata ili probno razdoblje nisu aktivni.';
  end if;

  if requested_feature = 'vehicles' then
    v_enabled := v_plan.id in ('business', 'pro');
  else
    v_enabled := coalesce((v_plan.features ->> requested_feature)::boolean, false);
  end if;

  if not v_enabled then
    raise exception 'Funkcija % nije dostupna u paketu %.', requested_feature, v_plan.name;
  end if;
end;
$$;

revoke all on function public.assert_subscription_feature_for_company(text, uuid) from public;
grant execute on function public.assert_subscription_feature_for_company(text, uuid) to authenticated;

create or replace function public.enforce_subscription_feature_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.assert_subscription_feature_for_company(TG_ARGV[0], new.company_id);
  return new;
end;
$$;

revoke all on function public.enforce_subscription_feature_trigger() from public;

drop trigger if exists invoices_subscription_feature on public.invoices;
create trigger invoices_subscription_feature
before insert or update on public.invoices
for each row execute function public.enforce_subscription_feature_trigger('invoices');

drop trigger if exists incoming_invoices_subscription_feature on public.incoming_invoices;
create trigger incoming_invoices_subscription_feature
before insert or update on public.incoming_invoices
for each row execute function public.enforce_subscription_feature_trigger('incoming_invoices');

drop trigger if exists inventory_items_subscription_feature on public.inventory_items;
create trigger inventory_items_subscription_feature
before insert or update on public.inventory_items
for each row execute function public.enforce_subscription_feature_trigger('inventory');

drop trigger if exists inventory_locations_subscription_feature on public.inventory_locations;
create trigger inventory_locations_subscription_feature
before insert or update on public.inventory_locations
for each row execute function public.enforce_subscription_feature_trigger('inventory');

drop trigger if exists inventory_location_stocks_subscription_feature on public.inventory_location_stocks;
create trigger inventory_location_stocks_subscription_feature
before insert or update on public.inventory_location_stocks
for each row execute function public.enforce_subscription_feature_trigger('inventory');

drop trigger if exists inventory_movements_subscription_feature on public.inventory_movements;
create trigger inventory_movements_subscription_feature
before insert or update on public.inventory_movements
for each row execute function public.enforce_subscription_feature_trigger('inventory');

drop trigger if exists vehicles_subscription_feature on public.vehicles;
create trigger vehicles_subscription_feature
before insert or update on public.vehicles
for each row execute function public.enforce_subscription_feature_trigger('vehicles');

drop trigger if exists vehicle_expenses_subscription_feature on public.vehicle_expenses;
create trigger vehicle_expenses_subscription_feature
before insert or update on public.vehicle_expenses
for each row execute function public.enforce_subscription_feature_trigger('vehicles');

drop trigger if exists vehicle_service_records_subscription_feature on public.vehicle_service_records;
create trigger vehicle_service_records_subscription_feature
before insert or update on public.vehicle_service_records
for each row execute function public.enforce_subscription_feature_trigger('vehicles');
