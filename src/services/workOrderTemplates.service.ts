import { supabase } from '../lib/supabase'

import type {
  WorkOrderMaterial,
  WorkOrderPriority,
} from '../types/workOrder'

export type WorkOrderTemplateMaterial = {
  name: string
  quantity: number
  unit: string
}

export type WorkOrderTemplate = {
  id: string
  companyId: string
  createdBy: string

  name: string
  title: string
  description: string
  materials: WorkOrderTemplateMaterial[]
  priority: WorkOrderPriority

  createdAt: string
  updatedAt: string
}

type TemplateRow = {
  id: string
  company_id: string
  created_by: string

  name: string
  title: string
  description: string
  materials: unknown
  priority: string

  created_at: string
  updated_at: string
}

export type SaveWorkOrderTemplateInput = {
  name: string
  title: string
  description: string
  materials: WorkOrderMaterial[]
  priority: WorkOrderPriority
}

function parseMaterials(
  value: unknown,
): WorkOrderTemplateMaterial[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        Array.isArray(item)
      ) {
        return null
      }

      const record =
        item as Record<string, unknown>

      const name =
        typeof record.name === 'string'
          ? record.name.trim()
          : ''

      if (!name) {
        return null
      }

      return {
        name,
        quantity:
          Math.max(
            0,
            Number(record.quantity) || 0,
          ),

        unit:
          typeof record.unit === 'string' &&
          record.unit.trim()
            ? record.unit.trim()
            : 'kom',
      }
    })
    .filter(
      (
        item,
      ): item is WorkOrderTemplateMaterial =>
        item !== null,
    )
}

function parsePriority(
  value: string,
): WorkOrderPriority {
  if (
    value === 'Nizak' ||
    value === 'Normalan' ||
    value === 'Visok' ||
    value === 'Hitno'
  ) {
    return value
  }

  return 'Normalan'
}

function mapRow(
  row: TemplateRow,
): WorkOrderTemplate {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by,

    name: row.name,
    title: row.title,
    description: row.description,

    materials:
      parseMaterials(
        row.materials,
      ),

    priority:
      parsePriority(
        row.priority,
      ),

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getCurrentCompanyId():
Promise<string> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'current_company_id',
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

async function getCurrentUserId():
Promise<string> {
  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  return user.id
}

export async function getWorkOrderTemplates():
Promise<WorkOrderTemplate[]> {
  const companyId =
    await getCurrentCompanyId()

  const {
    data,
    error,
  } = await supabase
    .from(
      'work_order_templates',
    )
    .select('*')
    .eq(
      'company_id',
      companyId,
    )
    .order(
      'name',
      {
        ascending: true,
      },
    )

  if (error) {
    throw error
  }

  return (
    (data ?? []) as TemplateRow[]
  ).map(mapRow)
}

export async function createWorkOrderTemplate(
  input: SaveWorkOrderTemplateInput,
): Promise<WorkOrderTemplate> {
  const [
    companyId,
    userId,
  ] =
    await Promise.all([
      getCurrentCompanyId(),
      getCurrentUserId(),
    ])

  const cleanName =
    input.name.trim()

  if (!cleanName) {
    throw new Error(
      'Unesite naziv predloška.',
    )
  }

  const materials =
    input.materials
      .map(
        (material) => ({
          name:
            material.name.trim(),

          quantity:
            Math.max(
              0,
              Number(
                material.quantity,
              ) || 0,
            ),

          unit:
            material.unit.trim() ||
            'kom',
        }),
      )
      .filter(
        (material) =>
          material.name !== '',
      )

  const {
    data,
    error,
  } = await supabase
    .from(
      'work_order_templates',
    )
    .insert({
      company_id:
        companyId,

      created_by:
        userId,

      name:
        cleanName,

      title:
        input.title.trim(),

      description:
        input.description.trim(),

      materials,

      priority:
        input.priority,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapRow(
    data as TemplateRow,
  )
}

export async function updateWorkOrderTemplate(
  id: string,
  input: SaveWorkOrderTemplateInput,
): Promise<WorkOrderTemplate> {
  const companyId =
    await getCurrentCompanyId()

  const materials =
    input.materials
      .map(
        (material) => ({
          name:
            material.name.trim(),

          quantity:
            Math.max(
              0,
              Number(
                material.quantity,
              ) || 0,
            ),

          unit:
            material.unit.trim() ||
            'kom',
        }),
      )
      .filter(
        (material) =>
          material.name !== '',
      )

  const {
    data,
    error,
  } = await supabase
    .from(
      'work_order_templates',
    )
    .update({
      name:
        input.name.trim(),

      title:
        input.title.trim(),

      description:
        input.description.trim(),

      materials,

      priority:
        input.priority,
    })
    .eq(
      'company_id',
      companyId,
    )
    .eq(
      'id',
      id,
    )
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapRow(
    data as TemplateRow,
  )
}

export async function deleteWorkOrderTemplate(
  id: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const {
    error,
  } = await supabase
    .from(
      'work_order_templates',
    )
    .delete()
    .eq(
      'company_id',
      companyId,
    )
    .eq(
      'id',
      id,
    )

  if (error) {
    throw error
  }
}
