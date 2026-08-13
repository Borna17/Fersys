import fs from 'node:fs'

const path =
  'src/admin/AdminCompaniesPage.tsx'

let code =
  fs.readFileSync(
    path,
    'utf8',
  )

if (
  !code.includes(
    'function getRemainingDaysLabel(',
  )
) {
  const anchor =
    'function CompanyRow({'

  const helper = `function getRemainingDaysLabel(
  company: AdminCompany,
) {
  const targetValue =
    company.subscriptionStatus === 'trialing'
      ? company.trialEndsAt
      : company.currentPeriodEnd

  if (!targetValue) {
    return ''
  }

  const target =
    new Date(targetValue)

  const today =
    new Date()

  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  const days =
    Math.ceil(
      (target.getTime() - today.getTime()) /
        86_400_000,
    )

  if (days < 0) {
    return \`Isteklo prije \${Math.abs(days)} d\`
  }

  if (days === 0) {
    return 'Istječe danas'
  }

  return \`Još \${days} dana\`
}

`

  if (!code.includes(anchor)) {
    throw new Error(
      'CompanyRow nije pronađen.',
    )
  }

  code =
    code.replace(
      anchor,
      helper + anchor,
    )
}

const oldPeriod = `  const periodLabel =
    company.subscriptionStatus ===
      'trialing' &&
    company.trialEndsAt
      ? \`Trial do \${formatDate(
          company.trialEndsAt,
        )}\`
      : company.currentPeriodEnd
        ? \`Do \${formatDate(
            company.currentPeriodEnd,
          )}\`
        : '—'`

const newPeriod = `${oldPeriod}

  const remainingLabel =
    getRemainingDaysLabel(
      company,
    )`

if (
  code.includes(oldPeriod) &&
  !code.includes(
    'const remainingLabel',
  )
) {
  code =
    code.replace(
      oldPeriod,
      newPeriod,
    )
}

const periodCell =
  `{periodLabel}`

if (
  code.includes(
    periodCell,
  ) &&
  !code.includes(
    '{remainingLabel &&',
  )
) {
  code =
    code.replace(
      periodCell,
      `{periodLabel}
            {remainingLabel && (
              <span className="mt-1 block text-[11px] font-black text-violet-300">
                {remainingLabel}
              </span>
            )}`,
    )
}

fs.writeFileSync(
  path,
  code,
)

console.log(
  '✅ AdminCompaniesPage: dodano preostalo dana.',
)
