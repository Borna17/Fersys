import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  roleLabels as defaultRoleLabels,
  type CompanyRole,
} from '../auth/permissions'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

export type CompanyRoleLabels =
  Record<CompanyRole, string>

const editableRoles:
  Exclude<CompanyRole, 'owner'>[] = [
  'admin',
  'manager',
  'worker',
  'assistant',
  'intern',
  'accounting',
  'viewer',
]

const CHANGE_EVENT =
  'fersys:company-role-labels-change'

let activeLabels:
  CompanyRoleLabels = {
    ...defaultRoleLabels,
  }

export function getCompanyRoleLabel(
  role: CompanyRole,
) {
  return (
    activeLabels[role] ||
    defaultRoleLabels[role]
  )
}

function applyLabels(
  overrides:
    Partial<CompanyRoleLabels>,
) {
  activeLabels = {
    ...defaultRoleLabels,
    ...overrides,
  }

  window.dispatchEvent(
    new Event(
      CHANGE_EVENT,
    ),
  )
}

export function useCompanyRoleLabelsSync() {
  const { membership } =
    useAuth()

  const companyId =
    membership?.companyId ?? ''

  const [, forceRender] =
    useState(0)

  const load =
    useCallback(
      async () => {
        if (!companyId) {
          applyLabels({})
          return
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              'company_role_labels',
            )
            .select(
              'role,label',
            )
            .eq(
              'company_id',
              companyId,
            )

        if (error) {
          console.error(
            'Nazive rankova nije moguće učitati:',
            error,
          )
          return
        }

        const next:
          Partial<CompanyRoleLabels> =
          {}

        for (
          const row of
            data ?? []
        ) {
          const role =
            row.role as
              CompanyRole

          const label =
            String(
              row.label ?? '',
            ).trim()

          if (
            role &&
            label
          ) {
            next[role] =
              label
          }
        }

        applyLabels(next)
      },
      [companyId],
    )

  useEffect(() => {
    const rerender = () =>
      forceRender(
        (current) =>
          current + 1,
      )

    window.addEventListener(
      CHANGE_EVENT,
      rerender,
    )

    return () => {
      window.removeEventListener(
        CHANGE_EVENT,
        rerender,
      )
    }
  }, [])

  useEffect(() => {
    void load()

    if (!companyId) {
      return
    }

    /*
     * VAŽNO:
     * više komponenti koristi useCompanyRoleLabelsSync()
     * (Sidebar, EmployeesPage, RoleLabelsEditor).
     *
     * Svaki hook dobiva JEDINSTVEN Realtime channel.
     * Tako Supabase nikada ne pokušava dodati novi
     * postgres_changes callback na channel koji je
     * već subscribe-an.
     */
    const channelName =
      `company-role-labels:${companyId}:${crypto.randomUUID()}`

    const channel =
      supabase
        .channel(
          channelName,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'company_role_labels',
            filter:
              `company_id=eq.${companyId}`,
          },
          () => {
            void load()
          },
        )
        .subscribe(
          (
            status,
            error,
          ) => {
            if (
              status ===
                'CHANNEL_ERROR' ||
              status ===
                'TIMED_OUT'
            ) {
              console.error(
                'Realtime naziva rankova:',
                status,
                error,
              )
            }
          },
        )

    function refreshOnFocus() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void load()
      }
    }

    document.addEventListener(
      'visibilitychange',
      refreshOnFocus,
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        refreshOnFocus,
      )

      void supabase
        .removeChannel(
          channel,
        )
    }
  }, [
    companyId,
    load,
  ])

  return useMemo(
    () => ({
      labels: {
        ...activeLabels,
      },
      getLabel:
        getCompanyRoleLabel,
      editableRoles,
      reload: load,
    }),
    [load],
  )
}

export async function saveCompanyRoleLabels(
  labels:
    Partial<CompanyRoleLabels>,
) {
  const {
    data: companyId,
    error:
      companyError,
  } =
    await supabase.rpc(
      'current_company_id',
    )

  if (
    companyError ||
    !companyId
  ) {
    throw new Error(
      companyError
        ?.message ||
      'Tvrtka nije pronađena.',
    )
  }

  const rows =
    editableRoles.map(
      (role) => ({
        company_id:
          String(companyId),
        role,
        label:
          labels[role]
            ?.trim() ||
          defaultRoleLabels[
            role
          ],
      }),
    )

  const {
    error,
  } =
    await supabase
      .from(
        'company_role_labels',
      )
      .upsert(
        rows,
        {
          onConflict:
            'company_id,role',
        },
      )

  if (error) {
    throw error
  }

  applyLabels(labels)
}

export async function resetCompanyRoleLabels() {
  const {
    data: companyId,
    error:
      companyError,
  } =
    await supabase.rpc(
      'current_company_id',
    )

  if (
    companyError ||
    !companyId
  ) {
    throw new Error(
      companyError
        ?.message ||
      'Tvrtka nije pronađena.',
    )
  }

  const {
    error,
  } =
    await supabase
      .from(
        'company_role_labels',
      )
      .delete()
      .eq(
        'company_id',
        String(
          companyId,
        ),
      )

  if (error) {
    throw error
  }

  applyLabels({})
}