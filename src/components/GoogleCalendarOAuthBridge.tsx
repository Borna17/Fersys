import {
  useEffect,
  useRef,
} from 'react'
import {
  useLocation,
} from 'react-router'

import {
  supabase,
} from '../lib/supabase'

const GOOGLE_SCOPE =
  'https://www.googleapis.com/auth/calendar.events'

const TOKEN_KEY =
  'fersys_google_calendar_access_token'

const TOKEN_EXPIRY_KEY =
  'fersys_google_calendar_access_token_expires_at'

const OAUTH_STATE_KEY =
  'fersys_google_calendar_oauth_state'

const OAUTH_STARTED_KEY =
  'fersys_google_calendar_oauth_started_at'

const OAUTH_ERROR_EVENT =
  'fersys:google-calendar-oauth-error'

type GoogleTokenResponse = {
  access_token?: string
  error?: string
}

type TokenClientConfig = {
  client_id: string
  scope: string
  callback: (
    response:
      GoogleTokenResponse,
  ) => void
  error_callback?: () => void
}

type TokenClient = {
  requestAccessToken: (
    options?: {
      prompt?: string
    },
  ) => void
}

type CodeClient = {
  requestCode: () => void
}

type GoogleOAuth2Api = {
  initTokenClient:
    (
      config:
        TokenClientConfig,
    ) => TokenClient

  initCodeClient:
    (
      config: {
        client_id: string
        scope: string
        ux_mode:
          'redirect'
        redirect_uri:
          string
        state:
          string
      },
    ) => CodeClient

  revoke:
    (
      token: string,
      callback?: () => void,
    ) => void

  __fersysPatched?: boolean
}

type GoogleWindow = Window & {
  google?: {
    accounts?: {
      oauth2?: GoogleOAuth2Api
    }
  }
}

function getGoogleOAuth2() {
  return (
    window as GoogleWindow
  ).google?.accounts?.oauth2
}


function isMobileOrStandalone() {
  const standalone =
    window.matchMedia(
      '(display-mode: standalone)',
    ).matches ||
    (
      'standalone' in navigator &&
      Boolean(
        (
          navigator as Navigator & {
            standalone?:
              boolean
          }
        ).standalone,
      )
    )

  const mobile =
    /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent,
    )

  return (
    standalone ||
    mobile
  )
}

function createState() {
  if (
    crypto.randomUUID
  ) {
    return crypto.randomUUID()
  }

  return [
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
    Math.random()
      .toString(36)
      .slice(2),
  ].join('-')
}

function getRedirectUri() {
  return `${window.location.origin}/calendar`
}

function getStoredToken() {
  const token =
    window.localStorage
      .getItem(
        TOKEN_KEY,
      )

  const expiresAt =
    Number(
      window.localStorage
        .getItem(
          TOKEN_EXPIRY_KEY,
        ) ?? 0,
    )

  if (
    !token ||
    !expiresAt ||
    Date.now() >=
      expiresAt
  ) {
    clearStoredToken()
    return ''
  }

  return token
}

function storeToken(
  token: string,
  expiresIn:
    number,
) {
  /*
   * Ostavimo 60 sekundi sigurnosne rezerve
   * kako ne bismo koristili token baš u trenutku isteka.
   */
  const safeLifetime =
    Math.max(
      60,
      expiresIn - 60,
    )

  window.localStorage.setItem(
    TOKEN_KEY,
    token,
  )

  window.localStorage.setItem(
    TOKEN_EXPIRY_KEY,
    String(
      Date.now() +
        safeLifetime *
          1000,
    ),
  )
}

function clearStoredToken() {
  window.localStorage.removeItem(
    TOKEN_KEY,
  )

  window.localStorage.removeItem(
    TOKEN_EXPIRY_KEY,
  )
}

function emitError(
  message: string,
) {
  window.dispatchEvent(
    new CustomEvent(
      OAUTH_ERROR_EVENT,
      {
        detail: {
          message,
        },
      },
    ),
  )
}

function cleanGoogleCallbackUrl() {
  const url =
    new URL(
      window.location.href,
    )

  url.searchParams.delete(
    'code',
  )
  url.searchParams.delete(
    'state',
  )
  url.searchParams.delete(
    'scope',
  )
  url.searchParams.delete(
    'authuser',
  )
  url.searchParams.delete(
    'prompt',
  )
  url.searchParams.delete(
    'error',
  )
  url.searchParams.delete(
    'error_description',
  )

  window.history.replaceState(
    {},
    '',
    `${url.pathname}${url.search}${url.hash}`,
  )
}

function findVisibleConnectButton() {
  const buttons =
    Array.from(
      document.querySelectorAll(
        'button',
      ),
    ) as
      HTMLButtonElement[]

  return buttons.find(
    (button) =>
      button.offsetParent !==
        null &&
      (
        button.innerText ||
        button.textContent ||
        ''
      )
        .toLowerCase()
        .includes(
          'poveži google kalendar',
        ),
  )
}

async function ensureGoogleScript() {
  if (
    getGoogleOAuth2()
  ) {
    return
  }

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      const existing =
        document.querySelector(
          'script[data-google-identity]',
        ) as
          HTMLScriptElement |
          null

      if (existing) {
        existing.addEventListener(
          'load',
          () =>
            resolve(),
          {
            once: true,
          },
        )

        existing.addEventListener(
          'error',
          () =>
            reject(
              new Error(
                'Google OAuth skripta se nije učitala.',
              ),
            ),
          {
            once: true,
          },
        )

        return
      }

      const script =
        document.createElement(
          'script',
        )

      script.src =
        'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset
        .googleIdentity =
        'true'

      script.onload =
        () => resolve()

      script.onerror =
        () =>
          reject(
            new Error(
              'Google OAuth skripta se nije učitala.',
            ),
          )

      document.head.appendChild(
        script,
      )
    },
  )
}

function startRedirectFlow(
  oauth2:
    GoogleOAuth2Api,
  clientId: string,
  scope: string,
) {
  const state =
    createState()

  const redirectUri =
    getRedirectUri()

  window.localStorage.setItem(
    OAUTH_STATE_KEY,
    state,
  )

  window.localStorage.setItem(
    OAUTH_STARTED_KEY,
    String(
      Date.now(),
    ),
  )

  const codeClient =
    oauth2.initCodeClient({
      client_id:
        clientId,
      scope:
        scope ||
        GOOGLE_SCOPE,
      ux_mode:
        'redirect',
      redirect_uri:
        redirectUri,
      state,
    })

  codeClient.requestCode()
}

function patchGoogleOAuth() {
  const oauth2 =
    getGoogleOAuth2()

  if (
    !oauth2 ||
    oauth2.__fersysPatched
  ) {
    return
  }

  const originalInitTokenClient =
    oauth2.initTokenClient.bind(
      oauth2,
    )

  const originalRevoke =
    oauth2.revoke.bind(
      oauth2,
    )

  oauth2.initTokenClient =
    (
      config:
        TokenClientConfig,
    ) => {
      const originalClient =
        originalInitTokenClient(
          config,
        )

      return {
        requestAccessToken(
          options,
        ) {
          const storedToken =
            getStoredToken()

          /*
           * Nakon redirecta samo vratimo spremljeni
           * kratkotrajni access token postojećem
           * CalendarPage callbacku.
           */
          if (storedToken) {
            window.setTimeout(
              () => {
                config.callback({
                  access_token:
                    storedToken,
                })
              },
              0,
            )
            return
          }

          /*
           * Na mobitelu i instaliranoj PWA ne koristimo
           * GIS token popup. Umjesto toga ide puni redirect
           * authorization-code flow.
           */
          if (
            isMobileOrStandalone()
          ) {
            startRedirectFlow(
              oauth2,
              config.client_id,
              config.scope,
            )
            return
          }

          /*
           * Desktop ostaje na postojećem popup modelu
           * koji korisniku već radi.
           */
          originalClient
            .requestAccessToken(
              options,
            )
        },
      }
    }

  oauth2.revoke =
    (
      token,
      callback,
    ) => {
      clearStoredToken()

      originalRevoke(
        token,
        callback,
      )
    }

  oauth2.__fersysPatched =
    true
}

async function ensurePatched() {
  await ensureGoogleScript()
  patchGoogleOAuth()
}

async function exchangeCode(
  code: string,
) {
  const clientId =
    import.meta.env
      .VITE_GOOGLE_CLIENT_ID ??
    ''

  if (!clientId) {
    throw new Error(
      'Nedostaje VITE_GOOGLE_CLIENT_ID.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        'google-calendar-oauth',
        {
          body: {
            code,
            clientId,
            redirectUri:
              getRedirectUri(),
          },
        },
      )

  if (error) {
    throw error
  }

  if (
    data?.error
  ) {
    throw new Error(
      String(
        data.error,
      ),
    )
  }

  const token =
    String(
      data?.accessToken ??
        '',
    )

  const expiresIn =
    Number(
      data?.expiresIn ??
        3600,
    )

  if (!token) {
    throw new Error(
      'Google nije vratio pristupni token.',
    )
  }

  storeToken(
    token,
    expiresIn,
  )
}

async function hydrateCalendarPage() {
  if (!getStoredToken()) {
    return
  }

  await ensurePatched()

  for (
    let attempt = 0;
    attempt < 30;
    attempt += 1
  ) {
    const button =
      findVisibleConnectButton()

    if (button) {
      button.click()
      return
    }

    await new Promise<void>(
      (resolve) =>
        window.setTimeout(
          resolve,
          120,
        ),
    )
  }
}

export default function GoogleCalendarOAuthBridge() {
  const location =
    useLocation()

  const processingRef =
    useRef(false)

  useEffect(() => {
    if (
      location.pathname !==
      '/calendar'
    ) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await ensurePatched()

        if (cancelled) {
          return
        }

        const params =
          new URLSearchParams(
            window.location.search,
          )

        const oauthError =
          params.get(
            'error',
          )

        const oauthErrorDescription =
          params.get(
            'error_description',
          )

        if (oauthError) {
          cleanGoogleCallbackUrl()

          emitError(
            oauthErrorDescription ||
              `Google autorizacija nije uspjela: ${oauthError}`,
          )
          return
        }

        const code =
          params.get(
            'code',
          )

        const returnedState =
          params.get(
            'state',
          )

        if (
          code &&
          !processingRef.current
        ) {
          processingRef.current =
            true

          const expectedState =
            window.localStorage
              .getItem(
                OAUTH_STATE_KEY,
              )

          const startedAt =
            Number(
              window.localStorage
                .getItem(
                  OAUTH_STARTED_KEY,
                ) ??
                0,
            )

          window.localStorage
            .removeItem(
              OAUTH_STATE_KEY,
            )

          window.localStorage
            .removeItem(
              OAUTH_STARTED_KEY,
            )

          if (
            !expectedState ||
            !returnedState ||
            expectedState !==
              returnedState
          ) {
            cleanGoogleCallbackUrl()

            throw new Error(
              'Google sigurnosna provjera nije prošla. Pokušaj ponovno povezati kalendar.',
            )
          }

          if (
            !startedAt ||
            Date.now() -
              startedAt >
              15 * 60 * 1000
          ) {
            cleanGoogleCallbackUrl()

            throw new Error(
              'Google povezivanje je isteklo. Pokušaj ponovno.',
            )
          }

          await exchangeCode(
            code,
          )

          cleanGoogleCallbackUrl()

          if (cancelled) {
            return
          }

          await hydrateCalendarPage()

          window.dispatchEvent(
            new CustomEvent(
              'fersys:google-calendar-connected',
            ),
          )

          processingRef.current =
            false
          return
        }

        /*
         * Ako je PWA ponovno otvorena, a kratkotrajni
         * token još vrijedi, automatski osvježimo status
         * CalendarPagea bez novog Google prozora.
         */
        if (
          getStoredToken()
        ) {
          await hydrateCalendarPage()
        }
      } catch (error) {
        processingRef.current =
          false

        cleanGoogleCallbackUrl()

        emitError(
          error instanceof Error
            ? error.message
            : 'Google Kalendar nije moguće povezati.',
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    location.pathname,
    location.search,
  ])

  useEffect(() => {
    function handleError(
      event: Event,
    ) {
      const detail =
        (
          event as
            CustomEvent<{
              message?:
                string
            }>
        ).detail

      if (
        detail?.message
      ) {
        console.error(
          'Google Calendar OAuth:',
          detail.message,
        )
      }
    }

    window.addEventListener(
      OAUTH_ERROR_EVENT,
      handleError,
    )

    return () => {
      window.removeEventListener(
        OAUTH_ERROR_EVENT,
        handleError,
      )
    }
  }, [])

  return null
}