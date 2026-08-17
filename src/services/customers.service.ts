import { supabase } from '../lib/supabase'
import { assertCanCreate } from '../subscription/subscription.service'
import type {
  Customer,
  CustomerInput,
  CustomerStatus,
  CustomerType,
} from '../types/customer'

type CustomerRow = {
  id: string
  company_id: string
  type: CustomerType
  name: string
  contact_person: string | null
  logo_data_url: string | null
  oib: string | null
  phone: string | null
  email: string | null
  street: string | null
  city: string | null
  postal_code: string | null
  iban: string | null
  notes: string | null
  work_orders_count: number | null
  total_spent: number | string | null
  status: CustomerStatus
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(value)
}

function mapCustomer(
  row: CustomerRow,
): Customer {
  return {
    id: row.id,
    companyId: row.company_id,
    type: row.type,
    name: row.name,
    contactPerson:
      row.contact_person ??
      undefined,
    logo:
      row.logo_data_url ??
      undefined,
    oib: row.oib ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    street: row.street ?? '',
    city: row.city ?? '',
    postalCode:
      row.postal_code ?? '',
    iban: row.iban ?? '',
    notes: row.notes ?? '',
    workOrders:
      Number(
        row.work_orders_count ??
          0,
      ),
    totalSpent:
      formatCurrency(
        Number(
          row.total_spent ??
            0,
        ),
      ),
    status: row.status,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  }
}

async function getCurrentCompanyId():
Promise<string> {
  const { data, error } =
    await supabase.rpc(
      'current_company_id',
    )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

export async function getCustomers():
Promise<Customer[]> {
  const { data, error } =
    await supabase
      .from('customers')
      .select('*')
      .is(
        'deleted_at',
        null,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )

  if (error) {
    throw error
  }

  return (
    (data ?? []) as CustomerRow[]
  ).map(mapCustomer)
}

export async function getCustomerById(
  customerId: string,
): Promise<Customer | null> {
  const { data, error } =
    await supabase
      .from('customers')
      .select('*')
      .eq(
        'id',
        customerId,
      )
      .is(
        'deleted_at',
        null,
      )
      .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapCustomer(
        data as CustomerRow,
      )
    : null
}

export async function createCustomer(
  input: CustomerInput,
): Promise<Customer> {
  await assertCanCreate(
    'customers',
  )

  const companyId =
    await getCurrentCompanyId()

  const cleanOib =
    input.oib.replace(
      /\D/g,
      '',
    )

  const { data, error } =
    await supabase
      .from('customers')
      .insert({
        company_id:
          companyId,
        type: input.type,
        name:
          input.name.trim(),
        contact_person:
          input.type ===
          'person'
            ? null
            : input.contactPerson
                ?.trim() ||
              null,
        logo_data_url:
          input.type ===
          'company'
            ? input.logo ||
              null
            : null,
        oib:
          cleanOib || null,
        phone:
          input.phone.trim() ||
          null,
        email:
          input.email
            .trim()
            .toLowerCase() ||
          null,
        street:
          input.street.trim() ||
          null,
        city:
          input.city.trim() ||
          null,
        postal_code:
          input.postalCode
            .trim() ||
          null,
        iban:
          input.iban
            .trim()
            .toUpperCase() ||
          null,
        notes:
          input.notes.trim() ||
          null,
        status:
          input.status ??
          'Aktivan',
      })
      .select('*')
      .single()

  if (error) {
    if (
      error.code === '23505'
    ) {
      throw new Error(
        'Investitor s ovim OIB-om već postoji u vašoj tvrtki.',
      )
    }

    throw error
  }

  return mapCustomer(
    data as CustomerRow,
  )
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput,
): Promise<Customer> {
  const cleanOib =
    input.oib.replace(
      /\D/g,
      '',
    )

  const { data, error } =
    await supabase
      .from('customers')
      .update({
        type: input.type,
        name:
          input.name.trim(),
        contact_person:
          input.type ===
          'person'
            ? null
            : input.contactPerson
                ?.trim() ||
              null,
        logo_data_url:
          input.type ===
          'company'
            ? input.logo ||
              null
            : null,
        oib:
          cleanOib || null,
        phone:
          input.phone.trim() ||
          null,
        email:
          input.email
            .trim()
            .toLowerCase() ||
          null,
        street:
          input.street.trim() ||
          null,
        city:
          input.city.trim() ||
          null,
        postal_code:
          input.postalCode
            .trim() ||
          null,
        iban:
          input.iban
            .trim()
            .toUpperCase() ||
          null,
        notes:
          input.notes.trim() ||
          null,
        status:
          input.status ??
          'Aktivan',
      })
      .eq(
        'id',
        customerId,
      )
      .is(
        'deleted_at',
        null,
      )
      .select('*')
      .single()

  if (error) {
    if (
      error.code === '23505'
    ) {
      throw new Error(
        'Drugi investitor s ovim OIB-om već postoji.',
      )
    }

    throw error
  }

  return mapCustomer(
    data as CustomerRow,
  )
}

/**
 * Investitore ne brišemo fizički iz baze jer mogu biti povezani
 * s ponudama, računima, nalozima, fotografijama i drugim dokumentima.
 *
 * Soft delete:
 * - investitor odmah nestaje iz FERSYS liste
 * - postojeći dokumenti i njihove veze ostaju sačuvani
 * - OIB se oslobađa kako bi se kasnije mogao koristiti na novom zapisu
 * - izbjegavamo FK greške "investitora nije moguće obrisati"
 */
export async function deleteCustomer(
  customerId: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { data, error } =
    await supabase
      .from('customers')
      .update({
        deleted_at:
          new Date().toISOString(),
        oib: null,
      })
      .eq(
        'id',
        customerId,
      )
      .eq(
        'company_id',
        companyId,
      )
      .is(
        'deleted_at',
        null,
      )
      .select('id')
      .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Investitor nije pronađen ili je već obrisan.',
    )
  }
}
