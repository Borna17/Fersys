import { supabase } from '../lib/supabase'
import type {
  WorkOrderMaterial,
  WorkOrderPriority,
} from '../types/workOrder'

export type WorkOrderTemplate = {
  id: string
  companyId: string
  createdBy: string
  name: string
  title: string
  description: string
  materials:
    WorkOrderMaterial[]
  priority:
    WorkOrderPriority
  createdAt: string
  updatedAt: string
}

export type WorkOrderTemplateInput = {
  name: string
  title: string
  description: string
  materials:
    WorkOrderMaterial[]
  priority:
    WorkOrderPriority
}

type WorkOrderTemplateRow = {
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

const priorities:
WorkOrderPriority[] = [
  'Nizak',
  'Normalan',
  'Visok',
  'Hitno',
]

function validPriority(
  value: unknown,
): WorkOrderPriority {
  return priorities.includes(
    value as
      WorkOrderPriority,
  )
    ? value as
        WorkOrderPriority
    : 'Normalan'
}

function cleanMaterials(
  value: unknown,
): WorkOrderMaterial[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item === 'object',
    )
    .map(
      (item) => {
        const row =
          item as Record<
            string,
            unknown
          >

        return {
          id:
            typeof row.id ===
              'string' &&
            row.id
              ? row.id
              : crypto.randomUUID(),
          name:
            String(
              row.name ?? '',
            ),
          quantity:
            Number(
              row.quantity ?? 1,
            ) || 0,
          unit:
            String(
              row.unit ?? 'kom',
            ),
          unitPrice:
            Number(
              row.unitPrice ??
              0,
            ) || 0,
        } satisfies WorkOrderMaterial
      },
    )
}

function mapRow(
  row:
    WorkOrderTemplateRow,
): WorkOrderTemplate {
  return {
    id: row.id,
    companyId:
      row.company_id,
    createdBy:
      row.created_by,
    name: row.name,
    title: row.title,
    description:
      row.description,
    materials:
      cleanMaterials(
        row.materials,
      ),
    priority:
      validPriority(
        row.priority,
      ),
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  }
}

function cleanInput(
  input:
    WorkOrderTemplateInput,
) {
  return {
    name:
      input.name.trim(),
    title:
      input.title.trim(),
    description:
      input.description.trim(),
    priority:
      validPriority(
        input.priority,
      ),
    materials:
      input.materials
        .map(
          (material) => ({
            ...material,
            name:
              material.name.trim(),
            unit:
              material.unit.trim() ||
              'kom',
            quantity:
              Number(
                material.quantity,
              ) || 0,
            unitPrice:
              Number(
                material.unitPrice,
              ) || 0,
          }),
        )
        .filter(
          (material) =>
            material.name !==
            '',
        ),
  }
}

export async function getWorkOrderTemplates():
Promise<WorkOrderTemplate[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'work_order_templates',
      )
      .select('*')
      .order(
        'name',
        {
          ascending: true,
        },
      )

  if (error) {
    throw new Error(
      `Predloške radnih naloga nije moguće učitati: ${error.message}`,
    )
  }

  return (
    (
      data ??
      []
    ) as WorkOrderTemplateRow[]
  ).map(mapRow)
}

export async function createWorkOrderTemplate(
  input:
    WorkOrderTemplateInput,
): Promise<WorkOrderTemplate> {
  const clean =
    cleanInput(input)

  if (!clean.name) {
    throw new Error(
      'Unesite naziv predloška.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_work_order_template_v1',
      {
        p_id: null,
        p_name:
          clean.name,
        p_title:
          clean.title,
        p_description:
          clean.description,
        p_materials:
          clean.materials,
        p_priority:
          clean.priority,
      },
    )

  if (error) {
    throw new Error(
      `Predložak radnog naloga nije moguće spremiti: ${error.message}`,
    )
  }

  if (!data) {
    throw new Error(
      'Predložak radnog naloga nije spremljen. Server nije vratio zapis.',
    )
  }

  return mapRow(
    data as WorkOrderTemplateRow,
  )
}

export async function updateWorkOrderTemplate(
  templateId: string,
  input:
    WorkOrderTemplateInput,
): Promise<WorkOrderTemplate> {
  const clean =
    cleanInput(input)

  if (!clean.name) {
    throw new Error(
      'Unesite naziv predloška.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_work_order_template_v1',
      {
        p_id:
          templateId,
        p_name:
          clean.name,
        p_title:
          clean.title,
        p_description:
          clean.description,
        p_materials:
          clean.materials,
        p_priority:
          clean.priority,
      },
    )

  if (error) {
    throw new Error(
      `Predložak radnog naloga nije moguće ažurirati: ${error.message}`,
    )
  }

  if (!data) {
    throw new Error(
      'Predložak radnog naloga nije ažuriran. Server nije vratio zapis.',
    )
  }

  return mapRow(
    data as WorkOrderTemplateRow,
  )
}

export async function deleteWorkOrderTemplate(
  templateId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'delete_work_order_template_v1',
      {
        p_id:
          templateId,
      },
    )

  if (error) {
    throw new Error(
      `Predložak radnog naloga nije moguće obrisati: ${error.message}`,
    )
  }
}
