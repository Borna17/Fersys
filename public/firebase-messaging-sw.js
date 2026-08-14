importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBM1dPzjGK5cZEv_P5fKGSGMMOZfP22VfQ',
  authDomain: 'fersys-2e3d3.firebaseapp.com',
  projectId: 'fersys-2e3d3',
  storageBucket: 'fersys-2e3d3.firebasestorage.app',
  messagingSenderId: '37815987533',
  appId: '1:37815987533:web:5a39d63f8ada0491175b04',
})

const messaging = firebase.messaging()

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const route =
    event.notification.data?.route ||
    '/dashboard'

  const target =
    new URL(
      route,
      self.location.origin,
    ).href

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(async (clients) => {
        for (const client of clients) {
          if (
            new URL(client.url).origin ===
            self.location.origin
          ) {
            await client.focus()

            if ('navigate' in client) {
              await client.navigate(target)
            }

            return
          }
        }

        if (self.clients.openWindow) {
          await self.clients.openWindow(
            target,
          )
        }
      }),
  )
})

messaging.onBackgroundMessage(
  (payload) => {
    const data =
      payload.data ?? {}

    return self.registration
      .showNotification(
        data.title || 'FERSYS',
        {
          body:
            data.body ||
            data.description ||
            'Imate novu FERSYS obavijest.',

          icon:
            '/pwa-192x192.png',

          badge:
            '/notification-badge-96.png',

          tag:
            data.notificationKey ||
            data.tag ||
            'fersys-notification',

          renotify: false,

          data: {
            route:
              data.route ||
              '/dashboard',

            notificationKey:
              data.notificationKey ||
              '',

            category:
              data.category ||
              '',
          },
        },
      )
  },
)
