import {
  createCustomer,
  getCustomers,
} from '../services/customers.service'
import type {
  Customer,
  CustomerInput,
  CustomerType,
} from '../types/customer'
import type {
  AiAssistantMessage,
  AiAssistantResponse,
  AiProposedAction,
} from '../services/aiAssistant.service'

function normalize(
  value: string,
) {
  return value
    .toLocaleLowerCase(
      'hr-HR',
    )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(
      /[^a-z0-9\s]/g,
      ' ',
    )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
}

function cleanName(
  value: string,
) {
  return value
    .replace(
      /^[\s:,\-–—]+/,
      '',
    )
    .replace(
      /[\s.,!?;:]+$/,
      '',
    )
    .replace(
      /^(koji se zove|koja se zove|pod imenom|ime je)\s+/i,
      '',
    )
    .trim()
}

function customerTypeFromText(
  text: string,
): CustomerType {
  const value =
    normalize(text)

  if (
    /\b(zgrada|ulaz|stambena)\b/.test(
      value,
    )
  ) {
    return 'building'
  }

  if (
    /\b(tvrtka|firma|obrt|doo|d o o|jdoo|j d o o)\b/.test(
      value,
    )
  ) {
    return 'company'
  }

  return 'person'
}

function typeLabel(
  type: CustomerType,
) {
  if (type === 'company') {
    return 'tvrtku / obrt'
  }

  if (type === 'building') {
    return 'zgradu'
  }

  return 'fizičku osobu'
}

function createIntent(
  text: string,
) {
  const match =
    text.match(
      /(?:napravi|kreiraj|dodaj|unesi|stvori)\s+(?:novog\s+|novu\s+)?(?:kupca|klijenta|investitora|naru[cč]itelja|firmu|tvrtku|obrt|zgradu)\s*(.*)$/i,
    )

  if (!match) {
    return null
  }

  const name =
    cleanName(
      match[1] || '',
    )

  if (!name) {
    return null
  }

  return {
    name,
    type:
      customerTypeFromText(
        text,
      ),
  }
}

function explicitLookupName(
  text: string,
) {
  const patterns = [
    /(?:prona[dđ]i|nadji|na[dđ]i|otvori|odaberi|izaberi|izaberi|poka[zž]i)\s+(?:mi\s+)?(?:kupca|klijenta|investitora|naru[cč]itelja|firmu|tvrtku|obrt|zgradu)\s+(.+)$/i,
    /(?:kupac|klijent|investitor|naru[cč]itelj|firma|tvrtka|obrt|zgrada)\s*[:\-]\s*(.+)$/i,
  ]

  for (
    const pattern of
      patterns
  ) {
    const match =
      text.match(
        pattern,
      )

    if (
      match?.[1]
    ) {
      const value =
        cleanName(
          match[1],
        )

      if (
        !/^(tog|tu|taj|njega|nju|isti|istu)$/i.test(
          value,
        )
      ) {
        return value
      }
    }
  }

  return ''
}

function scoreCustomer(
  customer: Customer,
  query: string,
) {
  const q =
    normalize(query)

  const name =
    normalize(
      customer.name,
    )

  if (!q || !name) {
    return 0
  }

  if (name === q) {
    return 100
  }

  if (
    name.startsWith(q) ||
    q.startsWith(name)
  ) {
    return 88
  }

  if (
    name.includes(q) ||
    q.includes(name)
  ) {
    return 78
  }

  const qTokens =
    new Set(
      q.split(' '),
    )

  const nameTokens =
    name.split(' ')

  const common =
    nameTokens.filter(
      (token) =>
        qTokens.has(token),
    ).length

  if (!common) {
    return 0
  }

  return Math.round(
    (
      common /
      Math.max(
        qTokens.size,
        nameTokens.length,
      )
    ) *
      70,
  )
}

function rankedMatches(
  customers: Customer[],
  query: string,
) {
  return customers
    .map(
      (customer) => ({
        customer,
        score:
          scoreCustomer(
            customer,
            query,
          ),
      }),
    )
    .filter(
      (item) =>
        item.score >= 45,
    )
    .sort(
      (a, b) =>
        b.score -
        a.score,
    )
}

function lastMentionedCustomer(
  customers: Customer[],
  conversation:
    AiAssistantMessage[],
) {
  for (
    let index =
      conversation.length - 1;
    index >= 0;
    index -= 1
  ) {
    const content =
      normalize(
        conversation[
          index
        ].content,
      )

    const matches =
      customers.filter(
        (customer) =>
          content.includes(
            normalize(
              customer.name,
            ),
          ),
      )

    if (
      matches.length === 1
    ) {
      return matches[0]
    }
  }

  return null
}

function isCustomerLookupIntent(
  text: string,
) {
  return /(?:prona[dđ]i|nadji|na[dđ]i|otvori|odaberi|izaberi|poka[zž]i).*(?:kupca|klijenta|investitora|naru[cč]itelja|firmu|tvrtku|obrt|zgradu)|(?:odaberi|otvori)\s+(?:tog|tu|taj|njega|nju)/i.test(
    text,
  )
}

export async function tryCustomerFastPath(
  text: string,
  conversation:
    AiAssistantMessage[],
): Promise<AiAssistantResponse | null> {
  const create =
    createIntent(
      text,
    )

  if (create) {
    const action:
      AiProposedAction = {
      type:
        'create_customer',
      title:
        `Dodaj investitora: ${create.name}`,
      description:
        `Kreirat ću ${typeLabel(
          create.type,
        )} "${create.name}". OIB i ostale podatke možeš dodati kasnije.`,
      requiresConfirmation:
        true,
      payload: {
        name:
          create.name,
        customerType:
          create.type,
      },
      warnings: [],
    }

    return {
      message:
        `Spreman sam dodati investitora "${create.name}". Potvrdi radnju ispod.`,
      proposedAction:
        action,
      clientAction:
        null,
    }
  }

  if (
    !isCustomerLookupIntent(
      text,
    )
  ) {
    return null
  }

  const customers =
    await getCustomers()

  if (
    customers.length === 0
  ) {
    return {
      message:
        'Još nema investitora u ovoj tvrtki. Reci npr. "Napravi novog kupca Ivan Horvat" i mogu ga odmah pripremiti za kreiranje.',
      proposedAction:
        null,
      clientAction:
        null,
    }
  }

  const query =
    explicitLookupName(
      text,
    )

  if (!query) {
    const previous =
      lastMentionedCustomer(
        customers,
        conversation,
      )

    if (previous) {
      return {
        message:
          `Pronašao sam investitora "${previous.name}" i otvaram njegov profil.`,
        proposedAction:
          null,
        clientAction: {
          type:
            'open_customer',
          payload: {
            customerId:
              previous.id,
            customerName:
              previous.name,
          },
        },
      }
    }

    return {
      message:
        'Napiši ime investitora kojeg želiš odabrati, npr. "Odaberi kupca Ivan Horvat".',
      proposedAction:
        null,
      clientAction:
        null,
    }
  }

  const ranked =
    rankedMatches(
      customers,
      query,
    )

  if (!ranked.length) {
    return {
      message:
        `Nisam pronašao investitora "${query}". Ako želiš, napiši "Napravi novog kupca ${query}" i mogu ga pripremiti za kreiranje.`,
      proposedAction:
        null,
      clientAction:
        null,
    }
  }

  const best =
    ranked[0]

  const second =
    ranked[1]

  const unambiguous =
    !second ||
    best.score >= 88 ||
    best.score -
      second.score >=
      18

  if (
    unambiguous
  ) {
    return {
      message:
        `Pronašao sam investitora "${best.customer.name}" i otvaram njegov profil.`,
      proposedAction:
        null,
      clientAction: {
        type:
          'open_customer',
        payload: {
          customerId:
            best.customer.id,
          customerName:
            best.customer.name,
        },
      },
    }
  }

  const options =
    ranked
      .slice(0, 4)
      .map(
        (
          item,
          index,
        ) =>
          `${index + 1}. ${item.customer.name}${
            item.customer.city
              ? ` — ${item.customer.city}`
              : ''
          }`,
      )
      .join('\n')

  return {
    message:
      `Pronašao sam više mogućih investitora:\n\n${options}\n\nNapiši puno ime ili grad kako bih odabrao točan zapis.`,
    proposedAction:
      null,
    clientAction:
      null,
  }
}

export async function confirmLocalCustomerCreation(
  action: AiProposedAction,
): Promise<AiAssistantResponse | null> {
  if (
    action.type !==
    'create_customer'
  ) {
    return null
  }

  const name =
    typeof action.payload
      .name === 'string'
      ? action.payload
          .name
          .trim()
      : ''

  if (!name) {
    throw new Error(
      'Nedostaje ime investitora.',
    )
  }

  const customerType =
    action.payload
      .customerType ===
      'company' ||
    action.payload
      .customerType ===
      'building'
      ? action.payload
          .customerType
      : 'person'

  const existing =
    await getCustomers()

  const duplicate =
    existing.find(
      (customer) =>
        normalize(
          customer.name,
        ) ===
        normalize(name),
    )

  if (duplicate) {
    return {
      message:
        `Investitor "${duplicate.name}" već postoji. Otvaram njegov profil.`,
      proposedAction:
        null,
      clientAction: {
        type:
          'open_customer',
        payload: {
          customerId:
            duplicate.id,
          customerName:
            duplicate.name,
        },
      },
    }
  }

  const input:
    CustomerInput = {
    type:
      customerType,
    name,
    contactPerson:
      '',
    oib: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    postalCode: '',
    iban: '',
    notes:
      'Kreirano putem FERSYS AI.',
    status:
      'Aktivan',
  }

  const created =
    await createCustomer(
      input,
    )

  return {
    message:
      `Investitor "${created.name}" je uspješno kreiran. Otvaram njegov profil.`,
    proposedAction:
      null,
    clientAction: {
      type:
        'open_customer',
      payload: {
        customerId:
          created.id,
        customerName:
          created.name,
      },
    },
  }
}
