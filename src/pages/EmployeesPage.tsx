import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Copy,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  allPermissions,
  defaultPermissionsByRole,
  permissionLabels,
  resolvePermissions,
  type EmployeePermissions as AuthEmployeePermissions,
  type PermissionKey,
} from '../auth/permissions'
import FersysLoader from '../components/FersysLoader'
import {
  cancelInvitation,
  copyInvitationLink,
  createInvitation,
  deleteInvitation,
  getEmployees,
  getInvitations,
  removeEmployee,
  renewInvitation,
  roleLabels,
  statusLabels,
  updateEmployeePermissions,
  updateEmployeeRole,
  updateEmployeeStatus,
  type CompanyEmployee,
  type CompanyInvitation,
  type CompanyRole,
  type MemberStatus,
} from '../services/employees.service'

type PageTab =
  | 'employees'
  | 'invitations'

type InvitationRole = Exclude<
  CompanyRole,
  'owner'
>

const invitationRoles: InvitationRole[] = [
  'admin',
  'manager',
  'worker',
  'assistant',
  'intern',
  'accounting',
  'viewer',
]

const editableRoles =
  invitationRoles

const permissionGroups: Array<{
  title: string
  description: string
  permissions: PermissionKey[]
}> = [
  {
    title: 'Osnovno',
    description:
      'Početna, kupci i kalendar.',
    permissions: [
      'dashboard.view',
      'customers.view',
      'customers.manage',
      'calendar.view',
    ],
  },
  {
    title: 'Radni nalozi',
    description:
      'Pregled, izrada, uređivanje i cijene radnih naloga.',
    permissions: [
      'workOrders.view',
      'workOrders.manage',
      'workOrders.viewPrices',
    ],
  },
  {
    title: 'Ponude i računi',
    description:
      'Ponude, izlazni i ulazni računi te financije.',
    permissions: [
      'offers.view',
      'offers.manage',
      'offers.viewPrices',
      'invoices.view',
      'incomingInvoices.view',
      'finance.view',
    ],
  },
  {
    title: 'Skladište',
    description:
      'Pregled skladišta, rad s materijalom i nabavne cijene.',
    permissions: [
      'inventory.view',
      'inventory.manage',
      'inventory.viewCosts',
    ],
  },
  {
    title: 'Vozila',
    description:
      'Pregled i upravljanje vozilima firme.',
    permissions: [
      'vehicles.view',
      'vehicles.manage',
    ],
  },
  {
    title: 'Tim i postavke',
    description:
      'Zaposlenici, AI pomoćnik i postavke firme.',
    permissions: [
      'employees.view',
      'employees.manage',
      'ai.use',
      'settings.manage',
    ],
  },
]

function formatDateTime(
  value: string,
) {
  if (!value) {
    return 'Nema podataka'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date)
}

function getInitials(
  name: string,
) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (
    parts.length === 0
  ) {
    return 'K'
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ??
        '',
    )
    .join('')
}

function getRoleClassName(
  role: CompanyRole,
) {
  if (
    role === 'owner'
  ) {
    return 'bg-amber-500/15 text-amber-400'
  }

  if (
    role === 'admin'
  ) {
    return 'bg-violet-500/15 text-violet-400'
  }

  if (
    role === 'manager'
  ) {
    return 'bg-blue-500/15 text-blue-400'
  }

  if (
    role === 'accounting'
  ) {
    return 'bg-emerald-500/15 text-emerald-400'
  }

  if (
    role === 'intern'
  ) {
    return 'bg-cyan-500/15 text-cyan-400'
  }

  return 'bg-slate-700 text-slate-300'
}

function getStatusClassName(
  status: MemberStatus,
) {
  if (
    status === 'active'
  ) {
    return 'bg-emerald-500/15 text-emerald-400'
  }

  if (
    status === 'blocked'
  ) {
    return 'bg-red-500/15 text-red-400'
  }

  return 'bg-slate-700 text-slate-400'
}

function getInvitationStatusLabel(
  status:
    CompanyInvitation['status'],
) {
  if (
    status === 'pending'
  ) {
    return 'Na čekanju'
  }

  if (
    status === 'accepted'
  ) {
    return 'Prihvaćena'
  }

  if (
    status === 'cancelled'
  ) {
    return 'Otkazana'
  }

  return 'Istekla'
}

function getInvitationStatusClassName(
  status:
    CompanyInvitation['status'],
) {
  if (
    status === 'pending'
  ) {
    return 'bg-amber-500/15 text-amber-400'
  }

  if (
    status === 'accepted'
  ) {
    return 'bg-emerald-500/15 text-emerald-400'
  }

  if (
    status === 'cancelled'
  ) {
    return 'bg-slate-700 text-slate-400'
  }

  return 'bg-red-500/15 text-red-400'
}

export function EmployeesPage() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<PageTab>(
      'employees',
    )

  const [
    employees,
    setEmployees,
  ] =
    useState<
      CompanyEmployee[]
    >([])

  const [
    invitations,
    setInvitations,
  ] =
    useState<
      CompanyInvitation[]
    >([])

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    loadError,
    setLoadError,
  ] = useState('')

  const [
    actionError,
    setActionError,
  ] = useState('')

  const [
    actionSuccess,
    setActionSuccess,
  ] = useState('')

  const [
    isInviteModalOpen,
    setIsInviteModalOpen,
  ] = useState(false)

  const [
    permissionEmployee,
    setPermissionEmployee,
  ] =
    useState<
      CompanyEmployee | null
    >(null)

  const [
    busyId,
    setBusyId,
  ] =
    useState<
      string | null
    >(null)

  const [
    copiedCode,
    setCopiedCode,
  ] =
    useState<
      string | null
    >(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        setIsLoading(true)
        setLoadError('')

        const [
          savedEmployees,
          savedInvitations,
        ] =
          await Promise.all([
            getEmployees(),
            getInvitations(),
          ])

        if (
          !cancelled
        ) {
          setEmployees(
            savedEmployees,
          )

          setInvitations(
            savedInvitations,
          )
        }
      } catch (error) {
        if (
          !cancelled
        ) {
          setLoadError(
            error instanceof
              Error
              ? error.message
              : 'Zaposlenike nije moguće učitati.',
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setIsLoading(
            false,
          )
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredEmployees =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      if (!needle) {
        return employees
      }

      return employees.filter(
        (employee) => {
          const text = [
            employee.fullName,
            employee.email,
            employee.phone,
            roleLabels[
              employee.role
            ],
            statusLabels[
              employee.status
            ],
          ]
            .join(' ')
            .toLocaleLowerCase(
              'hr-HR',
            )

          return text.includes(
            needle,
          )
        },
      )
    }, [
      employees,
      search,
    ])

  const filteredInvitations =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      if (!needle) {
        return invitations
      }

      return invitations.filter(
        (invitation) => {
          const text = [
            invitation.inviteeName,
            invitation.email,
            invitation.inviteCode,
            roleLabels[
              invitation.role
            ],
            getInvitationStatusLabel(
              invitation.status,
            ),
          ]
            .join(' ')
            .toLocaleLowerCase(
              'hr-HR',
            )

          return text.includes(
            needle,
          )
        },
      )
    }, [
      invitations,
      search,
    ])

  const stats =
    useMemo(
      () => ({
        total:
          employees.length,

        active:
          employees.filter(
            (employee) =>
              employee.status ===
              'active',
          ).length,

        blocked:
          employees.filter(
            (employee) =>
              employee.status ===
              'blocked',
          ).length,

        pendingInvitations:
          invitations.filter(
            (invitation) =>
              invitation.status ===
              'pending',
          ).length,
      }),
      [
        employees,
        invitations,
      ],
    )

  async function refreshData() {
    try {
      setIsLoading(true)
      setLoadError('')

      const [
        savedEmployees,
        savedInvitations,
      ] =
        await Promise.all([
          getEmployees(),
          getInvitations(),
        ])

      setEmployees(
        savedEmployees,
      )

      setInvitations(
        savedInvitations,
      )
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Podatke nije moguće osvježiti.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRoleChange(
    employee:
      CompanyEmployee,
    role:
      InvitationRole,
  ) {
    if (
      employee.role ===
        'owner' ||
      employee.role ===
        role
    ) {
      return
    }

    try {
      setBusyId(
        employee.membershipId,
      )

      setActionError('')
      setActionSuccess('')

      await updateEmployeeRole(
        employee.membershipId,
        role,
      )

      setEmployees(
        (current) =>
          current.map(
            (item) =>
              item.membershipId ===
              employee.membershipId
                ? {
                    ...item,
                    role,
                  }
                : item,
          ),
      )

      setActionSuccess(
        `Uloga korisnika ${employee.fullName} promijenjena je u ${roleLabels[role]}.`,
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Ulogu nije moguće promijeniti.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleStatusChange(
    employee:
      CompanyEmployee,
    status:
      MemberStatus,
  ) {
    if (
      employee.role ===
        'owner' ||
      employee.status ===
        status
    ) {
      return
    }

    try {
      setBusyId(
        employee.membershipId,
      )

      setActionError('')
      setActionSuccess('')

      await updateEmployeeStatus(
        employee.membershipId,
        status,
      )

      setEmployees(
        (current) =>
          current.map(
            (item) =>
              item.membershipId ===
              employee.membershipId
                ? {
                    ...item,
                    status,
                  }
                : item,
          ),
      )

      setActionSuccess(
        `Status korisnika ${employee.fullName} uspješno je promijenjen.`,
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Status zaposlenika nije moguće promijeniti.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemoveEmployee(
    employee:
      CompanyEmployee,
  ) {
    if (
      employee.role ===
      'owner'
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Želite li ukloniti korisnika ${employee.fullName} iz tvrtke?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setBusyId(
        employee.membershipId,
      )

      setActionError('')
      setActionSuccess('')

      await removeEmployee(
        employee.membershipId,
      )

      setEmployees(
        (current) =>
          current.filter(
            (item) =>
              item.membershipId !==
              employee.membershipId,
          ),
      )

      setActionSuccess(
        `${employee.fullName} uklonjen je iz tvrtke.`,
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Zaposlenika nije moguće ukloniti.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handlePermissionsSaved(
    employee:
      CompanyEmployee,
    permissions:
      AuthEmployeePermissions,
  ) {
    setEmployees(
      (current) =>
        current.map(
          (item) =>
            item.membershipId ===
            employee.membershipId
              ? {
                  ...item,
                  permissions: {
                    ...permissions,
                  },
                }
              : item,
        ),
    )

    setPermissionEmployee(
      null,
    )

    setActionError('')

    setActionSuccess(
      `Ovlasti za ${employee.fullName} uspješno su spremljene.`,
    )
  }

  async function handleCopyInvitation(
    invitation:
      CompanyInvitation,
  ) {
    try {
      setBusyId(
        invitation.id,
      )

      setActionError('')

      await copyInvitationLink(
        invitation.inviteCode,
      )

      setCopiedCode(
        invitation.inviteCode,
      )

      window.setTimeout(
        () => {
          setCopiedCode(
            null,
          )
        },
        2500,
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Poveznicu nije moguće kopirati.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancelInvitation(
    invitation:
      CompanyInvitation,
  ) {
    const confirmed =
      window.confirm(
        `Želite li otkazati pozivnicu za ${invitation.email}?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setBusyId(
        invitation.id,
      )

      setActionError('')

      await cancelInvitation(
        invitation.id,
      )

      setInvitations(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              invitation.id
                ? {
                    ...item,
                    status:
                      'cancelled',
                  }
                : item,
          ),
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Pozivnicu nije moguće otkazati.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleRenewInvitation(
    invitation:
      CompanyInvitation,
  ) {
    try {
      setBusyId(
        invitation.id,
      )

      setActionError('')

      const renewed =
        await renewInvitation(
          invitation,
        )

      setInvitations(
        (current) => {
          const cancelled =
            current.map(
              (
                item,
              ): CompanyInvitation =>
                item.id ===
                invitation.id
                  ? {
                      ...item,
                      status:
                        'cancelled',
                    }
                  : item,
            )

          return [
            renewed,
            ...cancelled,
          ]
        },
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Pozivnicu nije moguće obnoviti.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteInvitation(
    invitation:
      CompanyInvitation,
  ) {
    const confirmed =
      window.confirm(
        `Želite li trajno obrisati pozivnicu za ${invitation.email}?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setBusyId(
        invitation.id,
      )

      setActionError('')

      await deleteInvitation(
        invitation.id,
      )

      setInvitations(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              invitation.id,
          ),
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Pozivnicu nije moguće obrisati.',
      )
    } finally {
      setBusyId(null)
    }
  }

  function handleInvitationCreated(
    invitation:
      CompanyInvitation,
  ) {
    setInvitations(
      (current) => [
        invitation,
        ...current,
      ],
    )

    setActionError('')

    setActionSuccess(
      `Pozivnica za ${invitation.email} uspješno je izrađena.`,
    )

    setIsInviteModalOpen(
      false,
    )

    setActiveTab(
      'invitations',
    )
  }

  if (isLoading) {
    return (
      <FersysLoader
        text="Učitavanje zaposlenika..."
      />
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <Users
            size={42}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-5 text-2xl font-black text-white">
            Zaposlenike nije
            moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              void refreshData()
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1550px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">
              Zaposlenici
            </h1>

            <p className="mt-2 text-slate-400">
              Upravljaj ulogama,
              statusom i
              pojedinačnim
              ovlastima svakog
              korisnika.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void refreshData()
              }
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 font-bold text-white transition hover:bg-slate-700"
            >
              <RefreshCw
                size={18}
              />

              Osvježi
            </button>

            <button
              type="button"
              onClick={() =>
                setIsInviteModalOpen(
                  true,
                )
              }
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-500"
            >
              <Plus
                size={19}
              />

              Pozovi zaposlenika
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div className="mt-5 whitespace-pre-wrap break-words rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm leading-6 text-red-300">
            {actionError}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Ukupno korisnika"
            value={
              stats.total
            }
            icon={
              <Users className="text-blue-400" />
            }
            valueClassName="text-blue-400"
          />

          <StatCard
            label="Aktivni"
            value={
              stats.active
            }
            icon={
              <CheckCircle2 className="text-emerald-400" />
            }
            valueClassName="text-emerald-400"
          />

          <StatCard
            label="Blokirani"
            value={
              stats.blocked
            }
            icon={
              <Ban className="text-red-400" />
            }
            valueClassName="text-red-400"
          />

          <StatCard
            label="Pozivnice na čekanju"
            value={
              stats.pendingInvitations
            }
            icon={
              <Mail className="text-amber-400" />
            }
            valueClassName="text-amber-400"
          />
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
          <div className="flex min-w-max gap-1">
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'employees',
                )
              }
              className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                activeTab ===
                'employees'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users
                size={17}
              />

              Zaposlenici

              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">
                {
                  employees.length
                }
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'invitations',
                )
              }
              className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                activeTab ===
                'invitations'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Mail
                size={17}
              />

              Pozivnice

              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">
                {
                  invitations.length
                }
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="relative">
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder={
                activeTab ===
                'employees'
                  ? 'Pretraži zaposlenike...'
                  : 'Pretraži pozivnice...'
              }
              className="h-12 w-full rounded-xl bg-slate-800 pl-12 pr-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {activeTab ===
        'employees' ? (
          <EmployeesList
            employees={
              filteredEmployees
            }
            busyId={
              busyId
            }
            onRoleChange={
              handleRoleChange
            }
            onStatusChange={
              handleStatusChange
            }
            onPermissions={
              setPermissionEmployee
            }
            onRemove={
              handleRemoveEmployee
            }
          />
        ) : (
          <InvitationsList
            invitations={
              filteredInvitations
            }
            busyId={
              busyId
            }
            copiedCode={
              copiedCode
            }
            onCopy={
              handleCopyInvitation
            }
            onCancel={
              handleCancelInvitation
            }
            onRenew={
              handleRenewInvitation
            }
            onDelete={
              handleDeleteInvitation
            }
          />
        )}
      </section>

      {isInviteModalOpen && (
        <InvitationModal
          onClose={() =>
            setIsInviteModalOpen(
              false,
            )
          }
          onCreated={
            handleInvitationCreated
          }
        />
      )}

      {permissionEmployee && (
        <PermissionsModal
          employee={
            permissionEmployee
          }
          onClose={() =>
            setPermissionEmployee(
              null,
            )
          }
          onSaved={
            handlePermissionsSaved
          }
        />
      )}

      {busyId && (
        <FersysLoader
          fullScreen
          text="Spremanje promjena..."
        />
      )}
    </>
  )
}

function EmployeesList({
  employees,
  busyId,
  onRoleChange,
  onStatusChange,
  onPermissions,
  onRemove,
}: {
  employees:
    CompanyEmployee[]
  busyId:
    string | null
  onRoleChange: (
    employee:
      CompanyEmployee,
    role:
      InvitationRole,
  ) => Promise<void>
  onStatusChange: (
    employee:
      CompanyEmployee,
    status:
      MemberStatus,
  ) => Promise<void>
  onPermissions: (
    employee:
      CompanyEmployee,
  ) => void
  onRemove: (
    employee:
      CompanyEmployee,
  ) => Promise<void>
}) {
  return (
    <div className="mt-6 space-y-4">
      {employees.map(
        (employee) => (
          <article
            key={
              employee.membershipId
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <EmployeeIdentity
                  employee={
                    employee
                  }
                />

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoBox
                    label="E-mail"
                    value={
                      employee.email ||
                      '—'
                    }
                  />

                  <InfoBox
                    label="Telefon"
                    value={
                      employee.phone ||
                      '—'
                    }
                  />

                  <InfoBox
                    label="Zadnja prijava"
                    value={formatDateTime(
                      employee.lastSignInAt,
                    )}
                  />

                  <InfoBox
                    label="Član od"
                    value={formatDateTime(
                      employee.joinedAt,
                    )}
                  />
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[180px_160px_auto]">
                {employee.role ===
                'owner' ? (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                      Uloga
                    </p>

                    <span
                      className={`inline-flex h-11 items-center rounded-xl px-4 text-sm font-bold ${getRoleClassName(
                        employee.role,
                      )}`}
                    >
                      {
                        roleLabels[
                          employee.role
                        ]
                      }
                    </span>
                  </div>
                ) : (
                  <label>
                    <span className="mb-2 block text-xs font-bold uppercase text-slate-500">
                      Uloga
                    </span>

                    <div className="relative">
                      <select
                        value={
                          employee.role
                        }
                        disabled={
                          busyId ===
                          employee.membershipId
                        }
                        onChange={(
                          event,
                        ) =>
                          void onRoleChange(
                            employee,
                            event
                              .target
                              .value as InvitationRole,
                          )
                        }
                        className="h-11 w-full appearance-none rounded-xl bg-slate-800 px-3 pr-9 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                      >
                        {editableRoles.map(
                          (
                            role,
                          ) => (
                            <option
                              key={
                                role
                              }
                              value={
                                role
                              }
                            >
                              {
                                roleLabels[
                                  role
                                ]
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown
                        size={
                          16
                        }
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </label>
                )}

                {employee.role ===
                'owner' ? (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                      Status
                    </p>

                    <span className="inline-flex h-11 items-center rounded-xl bg-emerald-500/15 px-4 text-sm font-bold text-emerald-400">
                      Aktivan
                    </span>
                  </div>
                ) : (
                  <label>
                    <span className="mb-2 block text-xs font-bold uppercase text-slate-500">
                      Status
                    </span>

                    <select
                      value={
                        employee.status
                      }
                      disabled={
                        busyId ===
                        employee.membershipId
                      }
                      onChange={(
                        event,
                      ) =>
                        void onStatusChange(
                          employee,
                          event
                            .target
                            .value as MemberStatus,
                        )
                      }
                      className={`h-11 w-full rounded-xl px-3 text-sm font-bold outline-none ${getStatusClassName(
                        employee.status,
                      )}`}
                    >
                      <option value="active">
                        Aktivan
                      </option>

                      <option value="inactive">
                        Neaktivan
                      </option>

                      <option value="blocked">
                        Blokiran
                      </option>
                    </select>
                  </label>
                )}

                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                    Akcije
                  </p>

                  <div className="flex gap-2">
                    {employee.role !==
                      'owner' && (
                      <button
                        type="button"
                        disabled={
                          busyId ===
                          employee.membershipId
                        }
                        onClick={() =>
                          onPermissions(
                            employee,
                          )
                        }
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-500/10 px-4 text-sm font-bold text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"
                        title="Uredi ovlasti"
                      >
                        <KeyRound
                          size={
                            17
                          }
                        />

                        Ovlasti
                      </button>
                    )}

                    {employee.role !==
                      'owner' && (
                      <button
                        type="button"
                        disabled={
                          busyId ===
                          employee.membershipId
                        }
                        onClick={() =>
                          void onRemove(
                            employee,
                          )
                        }
                        className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                        title="Ukloni zaposlenika"
                      >
                        <Trash2
                          size={
                            18
                          }
                        />
                      </button>
                    )}

                    {employee.role ===
                      'owner' && (
                      <div className="flex h-11 items-center gap-2 rounded-xl bg-amber-500/10 px-4 text-sm font-bold text-amber-300">
                        <ShieldCheck
                          size={
                            17
                          }
                        />

                        Puni pristup
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ),
      )}

      {employees.length ===
        0 && (
        <EmptyState
          icon={
            <Users
              size={38}
            />
          }
          title="Nema pronađenih zaposlenika"
          description="Promijeni pojam pretrage."
        />
      )}
    </div>
  )
}

function PermissionsModal({
  employee,
  onClose,
  onSaved,
}: {
  employee:
    CompanyEmployee
  onClose: () => void
  onSaved: (
    employee:
      CompanyEmployee,
    permissions:
      AuthEmployeePermissions,
  ) => Promise<void>
}) {
  const [
    overrides,
    setOverrides,
  ] =
    useState<
      AuthEmployeePermissions
    >(() => {
      const clean:
        AuthEmployeePermissions =
        {}

      for (
        const permission of
        allPermissions
      ) {
        const value =
          employee.permissions[
            permission
          ]

        if (
          typeof value ===
          'boolean'
        ) {
          clean[
            permission
          ] = value
        }
      }

      return clean
    })

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const resolved =
    resolvePermissions(
      employee.role,
      overrides,
    )

  const defaultPermissions =
    defaultPermissionsByRole[
      employee.role
    ]

  function toggle(
    permission:
      PermissionKey,
  ) {
    setOverrides(
      (current) => ({
        ...current,
        [permission]:
          !resolved[
            permission
          ],
      }),
    )
  }

  function resetToRoleDefaults() {
    setOverrides({})
    setError('')
  }

  async function save() {
    if (isSaving) {
      return
    }

    try {
      setIsSaving(true)
      setError('')

      await updateEmployeePermissions(
        employee.membershipId,
        overrides,
      )

      await onSaved(
        employee,
        overrides,
      )
    } catch (saveError) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : 'Ovlasti nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-7">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
                <KeyRound
                  size={21}
                />
              </div>

              <div>
                <h2 className="text-xl font-black text-white sm:text-2xl">
                  Ovlasti zaposlenika
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {
                    employee.fullName
                  }{' '}
                  ·{' '}
                  {
                    roleLabels[
                      employee.role
                    ]
                  }
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
              Rank automatski
              postavlja početne
              ovlasti. Ovdje možeš
              pojedinom zaposleniku
              uključiti ili isključiti
              dodatne funkcije.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400 transition hover:text-white"
          >
            <X
              size={20}
            />
          </button>
        </div>

        <div className="max-h-[calc(94vh-185px)] overflow-y-auto px-5 py-5 sm:px-7">
          {error && (
            <div className="mb-5 whitespace-pre-wrap rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="font-bold text-blue-300">
              Kako radi
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Plava oznaka
              <b className="text-slate-200">
                {' '}
                Prilagođeno
              </b>{' '}
              znači da se ova
              ovlast razlikuje od
              zadanih prava ranka.
              Gumb „Vrati zadano“
              uklanja sve ručne
              izmjene za ovog
              zaposlenika.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            {permissionGroups.map(
              (group) => (
                <section
                  key={
                    group.title
                  }
                  className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:p-5"
                >
                  <h3 className="font-black text-white">
                    {
                      group.title
                    }
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {
                      group.description
                    }
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {group.permissions.map(
                      (
                        permission,
                      ) => {
                        const checked =
                          resolved[
                            permission
                          ]

                        const isCustom =
                          Object.prototype.hasOwnProperty.call(
                            overrides,
                            permission,
                          )

                        const defaultValue =
                          defaultPermissions[
                            permission
                          ]

                        return (
                          <button
                            key={
                              permission
                            }
                            type="button"
                            onClick={() =>
                              toggle(
                                permission,
                              )
                            }
                            className={`flex min-h-16 items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${
                              checked
                                ? 'border-blue-500/40 bg-blue-500/10'
                                : 'border-slate-800 bg-slate-900'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-white">
                                  {
                                    permissionLabels[
                                      permission
                                    ]
                                  }
                                </p>

                                {isCustom && (
                                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-300">
                                    Prilagođeno
                                  </span>
                                )}

                                {!isCustom && (
                                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                    Rank:{' '}
                                    {defaultValue
                                      ? 'uključeno'
                                      : 'isključeno'}
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  permission
                                }
                              </p>
                            </div>

                            <span
                              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                                checked
                                  ? 'bg-blue-600'
                                  : 'bg-slate-700'
                              }`}
                            >
                              <span
                                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                                  checked
                                    ? 'left-6'
                                    : 'left-1'
                                }`}
                              />
                            </span>
                          </button>
                        )
                      },
                    )}
                  </div>
                </section>
              ),
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <button
            type="button"
            disabled={
              isSaving
            }
            onClick={
              resetToRoleDefaults
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              size={16}
            />

            Vrati zadano za rank
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={
                onClose
              }
              className="h-11 flex-1 rounded-xl bg-slate-800 px-5 text-sm font-bold text-white sm:flex-none"
            >
              Odustani
            </button>

            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={() =>
                void save()
              }
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 sm:flex-none"
            >
              <Settings2
                size={17}
              />

              {isSaving
                ? 'Spremanje...'
                : 'Spremi ovlasti'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InvitationsList({
  invitations,
  busyId,
  copiedCode,
  onCopy,
  onCancel,
  onRenew,
  onDelete,
}: {
  invitations:
    CompanyInvitation[]
  busyId:
    string | null
  copiedCode:
    string | null
  onCopy: (
    invitation:
      CompanyInvitation,
  ) => Promise<void>
  onCancel: (
    invitation:
      CompanyInvitation,
  ) => Promise<void>
  onRenew: (
    invitation:
      CompanyInvitation,
  ) => Promise<void>
  onDelete: (
    invitation:
      CompanyInvitation,
  ) => Promise<void>
}) {
  return (
    <div className="mt-6 space-y-4">
      {invitations.map(
        (invitation) => (
          <article
            key={
              invitation.id
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-lg font-black text-white">
                    {invitation.inviteeName ||
                      invitation.email}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getInvitationStatusClassName(
                      invitation.status,
                    )}`}
                  >
                    {getInvitationStatusLabel(
                      invitation.status,
                    )}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getRoleClassName(
                      invitation.role,
                    )}`}
                  >
                    {
                      roleLabels[
                        invitation.role
                      ]
                    }
                  </span>
                </div>

                <p className="mt-2 break-all text-sm text-slate-400">
                  {
                    invitation.email
                  }
                </p>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                  <span>
                    Izrađeno:{' '}
                    {formatDateTime(
                      invitation.createdAt,
                    )}
                  </span>

                  <span>
                    Istječe:{' '}
                    {formatDateTime(
                      invitation.expiresAt,
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-xl bg-slate-950/60 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Pozivni kod
                  </p>

                  <p className="mt-1 font-mono text-sm font-black text-blue-400">
                    {
                      invitation.inviteCode
                    }
                  </p>
                </div>

                {invitation.status ===
                  'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={
                        busyId ===
                        invitation.id
                      }
                      onClick={() =>
                        void onCopy(
                          invitation,
                        )
                      }
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {copiedCode ===
                      invitation.inviteCode ? (
                        <CheckCircle2
                          size={
                            17
                          }
                        />
                      ) : (
                        <Copy
                          size={
                            17
                          }
                        />
                      )}

                      {copiedCode ===
                      invitation.inviteCode
                        ? 'Kopirano'
                        : 'Kopiraj link'}
                    </button>

                    <button
                      type="button"
                      disabled={
                        busyId ===
                        invitation.id
                      }
                      onClick={() =>
                        void onCancel(
                          invitation,
                        )
                      }
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-4 text-sm font-bold text-amber-400 disabled:opacity-50"
                    >
                      <Ban
                        size={
                          17
                        }
                      />

                      Otkaži
                    </button>
                  </>
                )}

                {invitation.status !==
                  'accepted' &&
                  invitation.status !==
                    'pending' && (
                    <button
                      type="button"
                      disabled={
                        busyId ===
                        invitation.id
                      }
                      onClick={() =>
                        void onRenew(
                          invitation,
                        )
                      }
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 text-sm font-bold text-emerald-400 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={
                          17
                        }
                      />

                      Obnovi
                    </button>
                  )}

                {invitation.status !==
                  'pending' && (
                  <button
                    type="button"
                    disabled={
                      busyId ===
                      invitation.id
                    }
                    onClick={() =>
                      void onDelete(
                        invitation,
                      )
                    }
                    className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-400 disabled:opacity-50"
                    title="Obriši pozivnicu"
                  >
                    <Trash2
                      size={18}
                    />
                  </button>
                )}
              </div>
            </div>

            {invitation.message && (
              <div className="mt-4 rounded-xl bg-slate-800/60 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Poruka
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {
                    invitation.message
                  }
                </p>
              </div>
            )}
          </article>
        ),
      )}

      {invitations.length ===
        0 && (
        <EmptyState
          icon={
            <Mail
              size={38}
            />
          }
          title="Nema pronađenih pozivnica"
          description="Izradi novu pozivnicu za zaposlenika."
        />
      )}
    </div>
  )
}

function InvitationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (
    invitation:
      CompanyInvitation,
  ) => void
}) {
  const [
    name,
    setName,
  ] = useState('')

  const [
    email,
    setEmail,
  ] = useState('')

  const [
    role,
    setRole,
  ] =
    useState<InvitationRole>(
      'worker',
    )

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    if (!email.trim()) {
      setError(
        'E-mail adresa je obavezna.',
      )

      return
    }

    try {
      setIsSubmitting(true)
      setError('')

      const invitation =
        await createInvitation(
          {
            email,
            name,
            role,
            message,
          },
        )

      onCreated(
        invitation,
      )
    } catch (submitError) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : 'Pozivnicu nije moguće izraditi.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-2xl font-black text-white">
              Pozovi zaposlenika
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Izradi pozivnicu
              i odaberi početni
              rank zaposlenika.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-400"
          >
            <X
              size={20}
            />
          </button>
        </div>

        <form
          onSubmit={
            submit
          }
          className="p-5 sm:p-6"
        >
          {error && (
            <div className="mb-5 whitespace-pre-wrap rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-bold text-slate-300">
                Ime i prezime
              </span>

              <input
                value={name}
                onChange={(
                  event,
                ) =>
                  setName(
                    event.target
                      .value,
                  )
                }
                className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Marko Horvat"
              />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-300">
                E-mail
              </span>

              <input
                type="email"
                required
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target
                      .value,
                  )
                }
                className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="marko@firma.hr"
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-bold text-slate-300">
                Rank
              </span>

              <select
                value={role}
                onChange={(
                  event,
                ) =>
                  setRole(
                    event.target
                      .value as InvitationRole,
                  )
                }
                className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
              >
                {invitationRoles.map(
                  (
                    invitationRole,
                  ) => (
                    <option
                      key={
                        invitationRole
                      }
                      value={
                        invitationRole
                      }
                    >
                      {
                        roleLabels[
                          invitationRole
                        ]
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-bold text-slate-300">
                Poruka
              </span>

              <textarea
                rows={4}
                value={
                  message
                }
                onChange={(
                  event,
                ) =>
                  setMessage(
                    event.target
                      .value,
                  )
                }
                className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Opcionalna poruka zaposleniku..."
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={
                isSubmitting
              }
              onClick={
                onClose
              }
              className="h-12 rounded-xl bg-slate-800 px-5 font-bold text-white disabled:opacity-50"
            >
              Odustani
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white disabled:opacity-50"
            >
              <Mail
                size={18}
              />

              {isSubmitting
                ? 'Slanje...'
                : 'Pošalji pozivnicu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmployeeIdentity({
  employee,
}: {
  employee:
    CompanyEmployee
}) {
  return (
    <div className="flex items-center gap-3">
      {employee.avatarUrl ? (
        <img
          src={
            employee.avatarUrl
          }
          alt={
            employee.fullName
          }
          className="h-12 w-12 shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-sm font-black text-blue-300">
          {getInitials(
            employee.fullName,
          )}
        </div>
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-black text-white">
            {
              employee.fullName
            }
          </p>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getRoleClassName(
              employee.role,
            )}`}
          >
            {
              roleLabels[
                employee.role
              ]
            }
          </span>
        </div>

        <p className="mt-1 truncate text-xs text-slate-500">
          {employee.email ||
            'E-mail nije unesen'}
        </p>
      </div>
    </div>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-800/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-300">
        {value}
      </p>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string
  value: number
  icon:
    React.ReactNode
  valueClassName:
    string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 text-3xl font-black ${valueClassName}`}
          >
            {value}
          </p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-800">
          {icon}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon:
    React.ReactNode
  title: string
  description:
    string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 px-5 py-12 text-center">
      <div className="mx-auto flex justify-center text-slate-600">
        {icon}
      </div>

      <h3 className="mt-4 font-black text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  )
}