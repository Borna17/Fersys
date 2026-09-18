create or replace function public.fersys_write_business_audit_v1()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_company_id uuid;
  v_actor uuid;
  v_actor_name text;
  v_entity_id uuid;
  v_action text;
  v_label text;
  v_route text;
  v_row jsonb;
begin
  if tg_op = 'DELETE' then v_row := to_jsonb(old); else v_row := to_jsonb(new); end if;
  v_company_id := nullif(v_row->>'company_id','')::uuid;
  v_actor := auth.uid();
  if v_actor is null then v_actor := nullif(v_row->>'created_by','')::uuid; end if;
  if v_actor is null or v_company_id is null then return coalesce(new, old); end if;

  select coalesce(nullif(p.full_name,''), split_part(u.email,'@',1), 'Korisnik')
    into v_actor_name
  from auth.users u left join public.profiles p on p.id=u.id
  where u.id=v_actor;
  v_actor_name := coalesce(v_actor_name,'Korisnik');

  begin v_entity_id := nullif(v_row->>'id','')::uuid; exception when others then v_entity_id := null; end;
  v_action := lower(tg_op);
  v_route := case tg_table_name
    when 'work_orders' then '/work-orders'
    when 'offers' then '/offers'
    when 'invoices' then '/invoices'
    when 'incoming_invoices' then '/incoming-invoices'
    when 'customers' then '/customers'
    when 'delivery_notes' then '/inventory/delivery-notes'
    when 'inventory_items' then '/inventory'
    when 'vehicles' then '/vehicles'
    else '' end;
  v_label := case tg_table_name
    when 'work_orders' then 'Radni nalog ' || coalesce(nullif(v_row->>'order_number',''), '')
    when 'offers' then 'Ponuda ' || coalesce(nullif(v_row->>'offer_number',''), '')
    when 'invoices' then 'Račun ' || coalesce(nullif(v_row->>'invoice_number',''), '')
    when 'incoming_invoices' then 'Ulazni račun ' || coalesce(nullif(v_row->>'invoice_number',''), '')
    when 'customers' then 'Investitor ' || coalesce(nullif(v_row->>'name',''), '')
    when 'delivery_notes' then 'Otpremnica ' || coalesce(nullif(v_row->>'delivery_note_number',''), '')
    when 'inventory_items' then 'Artikl ' || coalesce(nullif(v_row->>'name',''), '')
    when 'vehicles' then 'Vozilo ' || coalesce(nullif(v_row->>'registration',''), '')
    else 'Poslovna radnja' end;
  v_label := btrim(v_label);

  insert into public.activity_logs(company_id,actor_user_id,actor_name,action,entity_type,entity_id,description,metadata)
  values(v_company_id,v_actor,v_actor_name,v_action,tg_table_name,v_entity_id,
    case tg_op when 'INSERT' then 'Kreirano: '||v_label when 'UPDATE' then 'Ažurirano: '||v_label when 'DELETE' then 'Obrisano: '||v_label end,
    jsonb_build_object('route',v_route,'operation',tg_op));
  return coalesce(new, old);
end;
$$;

revoke all on function public.fersys_write_business_audit_v1() from public;

DO $$
declare t text;
begin
  foreach t in array array['work_orders','offers','invoices','incoming_invoices','customers','delivery_notes','inventory_items','vehicles'] loop
    execute format('drop trigger if exists fersys_business_audit_v1 on public.%I', t);
    execute format('create trigger fersys_business_audit_v1 after insert or update or delete on public.%I for each row execute function public.fersys_write_business_audit_v1()', t);
  end loop;
end $$;
