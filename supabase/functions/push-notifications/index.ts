import { createClient } from 'npm:@supabase/supabase-js@2.111.0'

type FcmTokenRow = {
  id: string
  user_id: string
  company_id: string
  token: string
}

type EventRow = {
  id: string
  company_id: string
  category: string
  title: string
  description: string
  route: string
  created_at: string
}

type PreferenceRow = {
  user_id: string
  company_id: string
  category: string
  mode: string
}

function json(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'content-type':
          'application/json; charset=utf-8',
      },
    },
  )
}

function requiredSecret(
  name: string,
) {
  const value =
    Deno.env.get(name)?.trim()

  if (!value) {
    throw new Error(
      `Nedostaje Edge Function secret: ${name}`,
    )
  }

  return value
}

function prefKey(
  userId: string,
  companyId: string,
  category: string,
) {
  return `${userId}:${companyId}:${category}`
}

function base64Url(
  bytes: Uint8Array,
) {
  let binary = ''

  for (
    const byte of bytes
  ) {
    binary +=
      String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function textBase64Url(
  value: string,
) {
  return base64Url(
    new TextEncoder()
      .encode(value),
  )
}

function pemToArrayBuffer(
  pem: string,
) {
  const normalized =
    pem
      .replace(/\\n/g, '\n')
      .replace(
        /-----BEGIN PRIVATE KEY-----/g,
        '',
      )
      .replace(
        /-----END PRIVATE KEY-----/g,
        '',
      )
      .replace(/\s/g, '')

  const binary =
    atob(normalized)

  const bytes =
    new Uint8Array(
      binary.length,
    )

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index)
  }

  return bytes.buffer
}

async function createGoogleJwt(
  clientEmail: string,
  privateKey: string,
) {
  const now =
    Math.floor(
      Date.now() / 1000,
    )

  const header =
    textBase64Url(
      JSON.stringify({
        alg: 'RS256',
        typ: 'JWT',
      }),
    )

  const payload =
    textBase64Url(
      JSON.stringify({
        iss:
          clientEmail,
        scope:
          'https://www.googleapis.com/auth/firebase.messaging',
        aud:
          'https://oauth2.googleapis.com/token',
        iat:
          now,
        exp:
          now + 3600,
      }),
    )

  const unsigned =
    `${header}.${payload}`

  const cryptoKey =
    await crypto.subtle
      .importKey(
        'pkcs8',
        pemToArrayBuffer(
          privateKey,
        ),
        {
          name:
            'RSASSA-PKCS1-v1_5',
          hash:
            'SHA-256',
        },
        false,
        ['sign'],
      )

  const signature =
    await crypto.subtle
      .sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder()
          .encode(unsigned),
      )

  return `${unsigned}.${base64Url(
    new Uint8Array(
      signature,
    ),
  )}`
}

async function getGoogleAccessToken() {
  const clientEmail =
    requiredSecret(
      'FIREBASE_CLIENT_EMAIL',
    )

  const privateKey =
    requiredSecret(
      'FIREBASE_PRIVATE_KEY',
    )

  const assertion =
    await createGoogleJwt(
      clientEmail,
      privateKey,
    )

  const response =
    await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/x-www-form-urlencoded',
        },
        body:
          new URLSearchParams({
            grant_type:
              'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
          }),
      },
    )

  const body =
    await response.json()

  if (!response.ok) {
    throw new Error(
      `Google OAuth nije uspio: ${response.status} ${JSON.stringify(body)}`,
    )
  }

  const accessToken =
    String(
      body.access_token ??
      '',
    )

  if (!accessToken) {
    throw new Error(
      'Google OAuth nije vratio access_token.',
    )
  }

  return accessToken
}

async function sendFcm(
  accessToken: string,
  projectId: string,
  token: string,
  event: EventRow,
) {
  const response =
    await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          'Content-Type':
            'application/json',
        },
        body:
          JSON.stringify({
            message: {
              token,

              notification: {
                title:
                  event.title,
                body:
                  event.description ||
                  'Nova FERSYS obavijest',
              },

              webpush: {
                headers: {
                  Urgency:
                    'high',
                },

                notification: {
                  icon:
                    '/pwa-192x192.png',
                  badge:
  '/notification-badge-96.png',
                  tag:
                    `fersys-${event.id}`,
                  renotify:
                    false,
                },

                fcm_options: {
                  link:
                    event.route ||
                    '/dashboard',
                },
              },

              data: {
                route:
                  event.route ||
                  '/dashboard',
                notificationKey:
                  `event-v2:${event.id}`,
                category:
                  event.category,
                title:
                  event.title,
                body:
                  event.description ||
                  '',
              },
            },
          }),
      },
    )

  const body =
    await response.json()
      .catch(
        () => ({}),
      )

  return {
    ok:
      response.ok,
    status:
      response.status,
    body,
  }
}

export default {
  async fetch(
    req: Request,
  ) {
    if (
      req.method !==
      'POST'
    ) {
      return json(
        {
          error:
            'Method not allowed',
        },
        405,
      )
    }

    try {
      const cronSecret =
        requiredSecret(
          'PUSH_CRON_SECRET',
        )

      const requestSecret =
        req.headers.get(
          'x-fersys-cron-secret',
        ) ?? ''

      if (
        requestSecret !==
        cronSecret
      ) {
        return json(
          {
            error:
              'Unauthorized',
          },
          401,
        )
      }

      const supabaseUrl =
        requiredSecret(
          'SUPABASE_URL',
        )

      const serviceRoleKey =
        requiredSecret(
          'SUPABASE_SERVICE_ROLE_KEY',
        )

      const firebaseProjectId =
        requiredSecret(
          'FIREBASE_PROJECT_ID',
        )

      const admin =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              persistSession:
                false,
              autoRefreshToken:
                false,
            },
          },
        )

      const since =
        new Date(
          Date.now() -
            3 *
              24 *
              60 *
              60 *
              1000,
        ).toISOString()

      const [
        tokensResult,
        eventsResult,
        preferencesResult,
      ] =
        await Promise.all([
          admin
            .from(
              'fcm_tokens',
            )
            .select(
              'id,user_id,company_id,token',
            )
            .eq(
              'active',
              true,
            ),

          admin
            .from(
              'notification_events_v2',
            )
            .select(
              'id,company_id,category,title,description,route,created_at',
            )
            .gte(
              'created_at',
              since,
            )
            .order(
              'created_at',
              {
                ascending:
                  true,
              },
            )
            .limit(500),

          admin
            .from(
              'notification_preferences_v2',
            )
            .select(
              'user_id,company_id,category,mode',
            ),
        ])

      if (
        tokensResult.error
      ) {
        throw tokensResult.error
      }

      if (eventsResult.error) {
        throw eventsResult.error
      }

      if (
        preferencesResult.error
      ) {
        throw preferencesResult.error
      }

      const tokens =
        (tokensResult.data ??
          []) as FcmTokenRow[]

      const events =
        (eventsResult.data ??
          []) as EventRow[]

      const preferences =
        (preferencesResult.data ??
          []) as PreferenceRow[]

      console.log(
        JSON.stringify({
          phase:
            'loaded',
          tokens:
            tokens.length,
          events:
            events.length,
        }),
      )

      if (
        tokens.length === 0 ||
        events.length === 0
      ) {
        return json({
          ok: true,
          sent: 0,
          skipped: 0,
          failed: 0,
          tokens:
            tokens.length,
          events:
            events.length,
        })
      }

      const preferenceMap =
        new Map<
          string,
          string
        >()

      for (
        const preference of
          preferences
      ) {
        preferenceMap.set(
          prefKey(
            preference.user_id,
            preference.company_id,
            preference.category,
          ),
          preference.mode,
        )
      }

      const tokenIds =
        tokens.map(
          (item) =>
            item.id,
        )

      const {
        data:
          deliveredRows,
        error:
          deliveredError,
      } =
        await admin
          .from(
            'fcm_delivery_log',
          )
          .select(
            'token_id,notification_key',
          )
          .in(
            'token_id',
            tokenIds,
          )

      if (
        deliveredError
      ) {
        throw deliveredError
      }

      const delivered =
        new Set<string>(
          (
            deliveredRows ??
            []
          ).map(
            (row) =>
              `${row.token_id}:${row.notification_key}`,
          ),
        )

      const accessToken =
        await getGoogleAccessToken()

      let sent = 0
      let skipped = 0
      let failed = 0

      for (
        const event of events
      ) {
        const companyTokens =
          tokens.filter(
            (token) =>
              token.company_id ===
              event.company_id,
          )

        for (
          const tokenRow of
            companyTokens
        ) {
          const mode =
            preferenceMap.get(
              prefKey(
                tokenRow.user_id,
                tokenRow.company_id,
                event.category,
              ),
            ) ??
            'enabled'

          if (
            mode !== 'enabled'
          ) {
            skipped += 1
            continue
          }

          const notificationKey =
            `event-v2:${event.id}`

          const deliveryKey =
            `${tokenRow.id}:${notificationKey}`

          if (
            delivered.has(
              deliveryKey,
            )
          ) {
            skipped += 1
            continue
          }

          const result =
            await sendFcm(
              accessToken,
              firebaseProjectId,
              tokenRow.token,
              event,
            )

          if (result.ok) {
            sent += 1

            const {
              error:
                logError,
            } =
              await admin
                .from(
                  'fcm_delivery_log',
                )
                .insert({
                  token_id:
                    tokenRow.id,
                  notification_key:
                    notificationKey,
                })

            if (
              logError &&
              logError.code !==
                '23505'
            ) {
              console.error(
                'FCM delivery log:',
                logError,
              )
            }

            delivered.add(
              deliveryKey,
            )

            console.log(
              JSON.stringify({
                phase:
                  'sent',
                eventId:
                  event.id,
                tokenId:
                  tokenRow.id,
              }),
            )

            continue
          }

          failed += 1

          console.error(
            'FCM send failed:',
            JSON.stringify({
              status:
                result.status,
              body:
                result.body,
              tokenId:
                tokenRow.id,
              eventId:
                event.id,
            }),
          )

          const errorCode =
            String(
              (
                result.body as {
                  error?: {
                    details?: Array<{
                      errorCode?: string
                    }>
                  }
                }
              )?.error
                ?.details?.[0]
                ?.errorCode ??
              '',
            )

          if (
            result.status ===
              404 ||
            errorCode ===
              'UNREGISTERED'
          ) {
            await admin
              .from(
                'fcm_tokens',
              )
              .update({
                active: false,
                updated_at:
                  new Date()
                    .toISOString(),
              })
              .eq(
                'id',
                tokenRow.id,
              )
          }
        }
      }

      console.log(
        JSON.stringify({
          phase:
            'finished',
          sent,
          skipped,
          failed,
          tokens:
            tokens.length,
          events:
            events.length,
        }),
      )

      return json({
        ok: true,
        sent,
        skipped,
        failed,
        tokens:
          tokens.length,
        events:
          events.length,
      })
    } catch (error) {
      console.error(
        'push-notifications:',
        error,
      )

      return json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error',
        },
        500,
      )
    }
  },
}
