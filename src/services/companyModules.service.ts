import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useAuth,
} from '../auth/AuthProvider'

import {
  supabase,
} from '../lib/supabase'

export type CompanyModuleKey =
  | 'customers'
  | 'work_orders'
  | 'offers'
  | 'invoices'
  | 'incoming_invoices'
  | 'calendar'
  | 'inventory'
  | 'vehicles'
  | 'employees'
  | 'ai'

export type CompanyModuleDefinition = {
  key: CompanyModuleKey
  label: string
  description: string
}

export const companyModules:
  CompanyModuleDefinition[] = [
  {
    key: 'work_orders',
    label: 'Radni nalozi',
    description:
      'Poslovi, intervencije, slike, materijal, potpis i PDF.',
  },
  {
    key: 'customers',
    label: 'Investitori',
    description:
      'Kontakti, OIB, adrese i povijest poslovanja.',
  },
  {
    key: 'offers',
    label: 'Ponude',
    description:
      'Izrada, slanje i praćenje ponuda.',
  },
  {
    key: 'invoices',
    label: 'Izlazni računi',
    description:
      'Izrada i evidencija izlaznih računa.',
  },
  {
    key: 'incoming_invoices',
    label: 'Ulazni računi',
    description:
      'Evidencija ulaznih računa i troškova.',
  },
  {
    key: 'calendar',
    label: 'Kalendar',
    description:
      'Termini, poslovi i raspored ekipe.',
  },
  {
    key: 'inventory',
    label: 'Skladište',
    description:
      'Artikli, količine, lokacije i kretanje materijala.',
  },
  {
    key: 'vehicles',
    label: 'Vozila',
    description:
      'Vozila tvrtke, servisi i evidencija.',
  },
  {
    key: 'employees',
    label: 'Zaposlenici',
    description:
      'Tim, uloge, ovlasti i pristup aplikaciji.',
  },
  {
    key: 'ai',
    label: 'AI pomoćnik',
    description:
      'FERSYS AI za dopuštene poslovne radnje.',
  },
]

export const allCompanyModuleKeys:
  CompanyModuleKey[] =
  companyModules.map(
    (item) => item.key,
  )

export const defaultNewCompanyModules:
  CompanyModuleKey[] = [
  'work_orders',
  'customers',
  'calendar',
]

const MODULES_UPDATED_EVENT =
  'fersys:company-modules-updated'

function isCompanyModuleKey(
  value: unknown,
): value is CompanyModuleKey {
  return (
    typeof value === 'string' &&
    allCompanyModuleKeys.includes(
      value as CompanyModuleKey,
    )
  )
}

function normalizeModules(
  value: unknown,
): CompanyModuleKey[] {
  if (!Array.isArray(value)) {
    return [
      ...allCompanyModuleKeys,
    ]
  }

  return value.filter(
    isCompanyModuleKey,
  )
}

type CompanyModuleRow = {
  enabled_modules:
    unknown
  module_setup_completed:
    boolean | null
}

export function moduleForPath(
  path: string,
):
  | CompanyModuleKey
  | null {
  if (
    path.startsWith(
      '/customers',
    )
  ) {
    return 'customers'
  }

  if (
    path.startsWith(
      '/work-orders',
    )
  ) {
    return 'work_orders'
  }

  if (
    path.startsWith(
      '/offers',
    )
  ) {
    return 'offers'
  }

  if (
    path.startsWith(
      '/incoming-invoices',
    )
  ) {
    return 'incoming_invoices'
  }

  if (
    path.startsWith(
      '/invoices',
    )
  ) {
    return 'invoices'
  }

  if (
    path.startsWith(
      '/calendar',
    )
  ) {
    return 'calendar'
  }

  if (
    path.startsWith(
      '/inventory',
    )
  ) {
    return 'inventory'
  }

  if (
    path.startsWith(
      '/vehicles',
    )
  ) {
    return 'vehicles'
  }

  if (
    path.startsWith(
      '/settings/employees',
    )
  ) {
    return 'employees'
  }

  if (
    path.startsWith('/ai')
  ) {
    return 'ai'
  }

  return null
}

export function
useCompanyModules() {
  const {
    membership,
    role,
  } = useAuth()

  const companyId =
    membership?.companyId ?? ''

  const [
    enabledModules,
    setEnabledModules,
  ] = useState<
    CompanyModuleKey[]
  >([...allCompanyModuleKeys])

  const [
    setupCompleted,
    setSetupCompleted,
  ] = useState(true)

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const load =
    useCallback(
      async () => {
        if (!companyId) {
          setIsLoading(false)
          return
        }

        try {
          setIsLoading(true)
          setError('')

          const {
            data,
            error:
              queryError,
          } = await supabase
            .from('companies')
            .select(
              'enabled_modules,module_setup_completed',
            )
            .eq(
              'id',
              companyId,
            )
            .single()

          if (queryError) {
            throw queryError
          }

          const row =
            data as CompanyModuleRow

          const completed =
            row
              .module_setup_completed ===
            true

          setSetupCompleted(
            completed,
          )

          setEnabledModules(
            completed
              ? normalizeModules(
                  row.enabled_modules,
                )
              : [
                  ...defaultNewCompanyModules,
                ],
          )
        } catch (
          nextError
        ) {
          console.error(
            'Moduli tvrtke nisu učitani:',
            nextError,
          )

          setError(
            nextError instanceof
              Error
              ? nextError.message
              : 'Module nije moguće učitati.',
          )

          // Ako SQL još nije pokrenut,
          // aplikacija se ne smije raspasti.
          setEnabledModules(
            [
              ...allCompanyModuleKeys,
            ],
          )
          setSetupCompleted(true)
        } finally {
          setIsLoading(false)
        }
      },
      [companyId],
    )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    function handleUpdated(
      event: Event,
    ) {
      const custom =
        event as CustomEvent<{
          companyId:
            string
          enabledModules:
            CompanyModuleKey[]
          setupCompleted:
            boolean
        }>

      if (
        custom.detail
          ?.companyId !==
        companyId
      ) {
        return
      }

      setEnabledModules(
        custom.detail
          .enabledModules,
      )

      setSetupCompleted(
        custom.detail
          .setupCompleted,
      )
    }

    window.addEventListener(
      MODULES_UPDATED_EVENT,
      handleUpdated,
    )

    return () => {
      window.removeEventListener(
        MODULES_UPDATED_EVENT,
        handleUpdated,
      )
    }
  }, [companyId])

  const enabledSet =
    useMemo(
      () =>
        new Set(
          enabledModules,
        ),
      [enabledModules],
    )

  const isEnabled =
    useCallback(
      (
        key:
          CompanyModuleKey,
      ) =>
        enabledSet.has(key),
      [enabledSet],
    )

  const isPathEnabled =
    useCallback(
      (path: string) => {
        const module =
          moduleForPath(path)

        return (
          !module ||
          enabledSet.has(module)
        )
      },
      [enabledSet],
    )

  const save =
    useCallback(
      async (
        modules:
          CompanyModuleKey[],
        complete = true,
      ) => {
        if (!companyId) {
          throw new Error(
            'Tvrtka nije pronađena.',
          )
        }

        if (
          role !== 'owner'
        ) {
          throw new Error(
            'Samo vlasnik može mijenjati module tvrtke.',
          )
        }

        const clean =
          Array.from(
            new Set(
              modules.filter(
                isCompanyModuleKey,
              ),
            ),
          )

        const {
          error:
            updateError,
        } = await supabase
          .from('companies')
          .update({
            enabled_modules:
              clean,
            module_setup_completed:
              complete,
          })
          .eq(
            'id',
            companyId,
          )

        if (updateError) {
          throw updateError
        }

        setEnabledModules(
          clean,
        )
        setSetupCompleted(
          complete,
        )

        window.dispatchEvent(
          new CustomEvent(
            MODULES_UPDATED_EVENT,
            {
              detail: {
                companyId,
                enabledModules:
                  clean,
                setupCompleted:
                  complete,
              },
            },
          ),
        )
      },
      [
        companyId,
        role,
      ],
    )

  return {
    companyId,
    role,
    enabledModules,
    setupCompleted,
    isLoading,
    error,
    isEnabled,
    isPathEnabled,
    save,
    reload: load,
  }
}
