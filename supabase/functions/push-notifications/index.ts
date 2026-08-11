import { createClient } from 'npm:@supabase/supabase-js@2.111.0'
import webpush from 'npm:web-push@3.6.7'

type PushSubscriptionRow = {
  id: string
  user_id: string
  company_id: string
  endpoint: string
  p256dh: string
  auth: string
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

export default {
  async fetch(
    req: Request,
  ) {
    if (
      req.method !== 'POST'
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

      const vapidPublicKey =
        requiredSecret(
          'VAPID_PUBLIC_KEY',
        )

      const vapidPrivateKey =
        requiredSecret(
          'VAPID_PRIVATE_KEY',
        )

      const vapidSubject =
        requiredSecret(
          'VAPID_SUBJECT',
        )

      webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey,
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
        subscriptionsResult,
        eventsResult,
        preferencesResult,
      ] =
        await Promise.all([
          admin
            .from(
              'push_subscriptions',
            )
            .select(
              'id,user_id,company_id,endpoint,p256dh,auth',
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
        subscriptionsResult.error
      ) {
        throw subscriptionsResult.error
      }

      if (eventsResult.error) {
        throw eventsResult.error
      }

      if (
        preferencesResult.error
      ) {
        throw preferencesResult.error
      }

      const subscriptions =
        (subscriptionsResult.data ??
          []) as
          PushSubscriptionRow[]

      const events =
        (eventsResult.data ??
          []) as EventRow[]

      const preferences =
        (preferencesResult.data ??
          []) as
          PreferenceRow[]

      if (
        subscriptions.length ===
          0 ||
        events.length === 0
      ) {
        return json({
          ok: true,
          sent: 0,
          subscriptions:
            subscriptions.length,
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

      const subscriptionIds =
        subscriptions.map(
          (item) => item.id,
        )

      const keys =
        events.flatMap(
          (event) =>
            subscriptions
              .filter(
                (subscription) =>
                  subscription
                    .company_id ===
                  event.company_id,
              )
              .map(
                (subscription) =>
                  `${subscription.id}:event-v2:${event.id}`,
              ),
        )

      const delivered =
        new Set<string>()

      if (
        subscriptionIds.length >
          0 &&
        keys.length > 0
      ) {
        const {
          data:
            deliveredRows,
          error:
            deliveredError,
        } =
          await admin
            .from(
              'push_delivery_log',
            )
            .select(
              'subscription_id,notification_key',
            )
            .in(
              'subscription_id',
              subscriptionIds,
            )
            .in(
              'notification_key',
              keys.map(
                (key) =>
                  key.split(
                    ':',
                  )
                    .slice(1)
                    .join(':'),
              ),
            )

        if (deliveredError) {
          throw deliveredError
        }

        for (
          const row of
            deliveredRows ?? []
        ) {
          delivered.add(
            `${row.subscription_id}:${row.notification_key}`,
          )
        }
      }

      let sent = 0
      let skipped = 0
      let failed = 0

      for (
        const event of events
      ) {
        const companySubscriptions =
          subscriptions.filter(
            (subscription) =>
              subscription
                .company_id ===
              event.company_id,
          )

        for (
          const subscription of
            companySubscriptions
        ) {
          const preferenceMode =
            preferenceMap.get(
              prefKey(
                subscription.user_id,
                subscription.company_id,
                event.category,
              ),
            ) ?? 'enabled'

          /*
           * "silent" u FERSYS-u znači da korisnik
           * ne želi vanjski push za tu kategoriju.
           * U zvoncu i dalje može vidjeti događaj.
           */
          if (
            preferenceMode !==
            'enabled'
          ) {
            skipped += 1
            continue
          }

          const notificationKey =
            `event-v2:${event.id}`

          const deliveryKey =
            `${subscription.id}:${notificationKey}`

          if (
            delivered.has(
              deliveryKey,
            )
          ) {
            skipped += 1
            continue
          }

          const payload =
            JSON.stringify({
              title:
                event.title,
              body:
                event.description ||
                'Nova FERSYS obavijest',
              route:
                event.route ||
                '/dashboard',
              notificationKey,
              tag:
                notificationKey,
              category:
                event.category,
            })

          try {
            await webpush
              .sendNotification(
                {
                  endpoint:
                    subscription.endpoint,
                  keys: {
                    p256dh:
                      subscription.p256dh,
                    auth:
                      subscription.auth,
                  },
                },
                payload,
                {
                  TTL:
                    60 * 60 * 24,
                  urgency:
                    'normal',
                },
              )

            const {
              error:
                logError,
            } =
              await admin
                .from(
                  'push_delivery_log',
                )
                .insert({
                  subscription_id:
                    subscription.id,
                  notification_key:
                    notificationKey,
                })

            if (
              logError &&
              logError.code !==
                '23505'
            ) {
              console.error(
                'Push delivery log:',
                logError,
              )
            }

            delivered.add(
              deliveryKey,
            )

            sent += 1
          } catch (error) {
            failed += 1

            const statusCode =
              Number(
                (
                  error as {
                    statusCode?:
                      number
                  }
                )?.statusCode ??
                  0,
              )

            console.error(
              'Web Push send:',
              statusCode,
              error,
            )

            if (
              statusCode ===
                404 ||
              statusCode ===
                410
            ) {
              await admin
                .from(
                  'push_subscriptions',
                )
                .update({
                  active:
                    false,
                  updated_at:
                    new Date()
                      .toISOString(),
                })
                .eq(
                  'id',
                  subscription.id,
                )
            }
          }
        }
      }

      return json({
        ok: true,
        sent,
        skipped,
        failed,
        subscriptions:
          subscriptions.length,
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
