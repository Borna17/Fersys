import { createClient } from 'npm:@supabase/supabase-js@2.111.0'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Nedostaje Edge Function secret: ${name}`)
  return value
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function textBase64Url(value: string) {
  return base64Url(new TextEncoder().encode(value))
}

function pemToArrayBuffer(pem: string) {
  const normalized = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function getGoogleAccessToken() {
  const clientEmail = requiredSecret('FIREBASE_CLIENT_EMAIL')
  const privateKey = requiredSecret('FIREBASE_PRIVATE_KEY')
  const now = Math.floor(Date.now() / 1000)
  const header = textBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = textBase64Url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${payload}`
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned),
  )
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const body = await response.json()
  if (!response.ok || !body.access_token) {
    throw new Error(`Google OAuth nije uspio: ${response.status} ${JSON.stringify(body)}`)
  }
  return String(body.access_token)
}

async function sendFcm(accessToken: string, projectId: string, token: string) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: 'FERSYS testna obavijest',
            body: 'Push obavijesti rade na ovom uređaju.',
          },
          android: {
            priority: 'high',
            notification: {
              channel_id: 'fersys_default',
              sound: 'default',
            },
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default' } },
          },
          webpush: {
            headers: { Urgency: 'high' },
            notification: {
              icon: '/pwa-192x192.png',
              badge: '/notification-badge-96.png',
              tag: `fersys-test-${Date.now()}`,
            },
            fcm_options: { link: '/settings/notifications' },
          },
          data: {
            route: '/settings/notifications',
            category: 'system',
            title: 'FERSYS testna obavijest',
            body: 'Push obavijesti rade na ovom uređaju.',
          },
        },
      }),
    },
  )
  const body = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, body }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authorization = req.headers.get('authorization') ?? ''
    const jwt = authorization.replace(/^Bearer\s+/i, '').trim()
    if (!jwt) return json({ error: 'Nedostaje prijava korisnika.' }, 401)

    const supabaseUrl = requiredSecret('SUPABASE_URL')
    const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY')
    const firebaseProjectId = requiredSecret('FIREBASE_PROJECT_ID')
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await admin.auth.getUser(jwt)
    if (userError || !userData.user) return json({ error: 'Nevažeća prijava korisnika.' }, 401)

    const { data: tokens, error: tokenError } = await admin
      .from('fcm_tokens')
      .select('id,token')
      .eq('user_id', userData.user.id)
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (tokenError) throw tokenError
    if (!tokens?.length) {
      return json({ error: 'Ovaj korisnik još nema registriran push uređaj.' }, 409)
    }

    const accessToken = await getGoogleAccessToken()
    let sent = 0
    let failed = 0

    for (const row of tokens) {
      const result = await sendFcm(accessToken, firebaseProjectId, String(row.token))
      if (result.ok) {
        sent += 1
        continue
      }

      failed += 1
      const errorCode = String((result.body as { error?: { details?: Array<{ errorCode?: string }> } })?.error?.details?.[0]?.errorCode ?? '')
      if (result.status === 404 || errorCode === 'UNREGISTERED') {
        await admin.from('fcm_tokens').update({
          active: false,
          updated_at: new Date().toISOString(),
        }).eq('id', row.id)
      }
    }

    if (sent === 0) {
      return json({ error: 'Testna push poruka nije poslana ni na jedan registrirani uređaj.', sent, failed }, 502)
    }

    return json({ ok: true, sent, failed })
  } catch (error) {
    console.error('send-test-push:', error)
    return json({
      error: error instanceof Error ? error.message : 'Testnu push poruku nije moguće poslati.',
    }, 500)
  }
})
