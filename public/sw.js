/* 离线缓存：页面和静态资源装进 Cache，域名抽风时也能打开 */
const CACHE = 'ds-demo-v1'
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(SHELL).catch(() => {})
      try {
        const res = await fetch('./', { cache: 'reload' })
        const html = await res.clone().text()
        await cache.put('./', res)
        const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1])
        await cache.addAll(assets)
      } catch {
        /* 首次装不上缓存就等运行时填充 */
      }
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) {
          await caches.delete(key)
        }
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }
  const url = new URL(request.url)
  // 只接管本站资源，API 请求原样走网络
  if (url.origin !== self.location.origin) {
    return
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request, { ignoreSearch: true })
      if (cached) {
        fetch(request)
          .then((res) => {
            if (res.ok) {
              cache.put(request, res.clone())
            }
          })
          .catch(() => {})
        return cached
      }
      try {
        const res = await fetch(request)
        if (res.ok) {
          cache.put(request, res.clone())
        }
        return res
      } catch (error) {
        if (request.mode === 'navigate') {
          const shell = await cache.match('./', { ignoreSearch: true })
          if (shell) {
            return shell
          }
        }
        throw error
      }
    })()
  )
})
