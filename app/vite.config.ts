import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Application web installable (PWA) : manifest + service worker
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // enregistré dans src/lib/pwa.ts
      includeAssets: ["favicon.ico", "icons/apple-touch-icon.png", "icons/favicon-64.png"],
      manifest: {
        id: "/",
        name: "Sentinelle237",
        short_name: "Sentinelle",
        description: "Veille économique et informationnelle : flux, alertes, enquêtes et marchés.",
        lang: "fr",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#efefee",
        theme_color: "#efefee",
        categories: ["news", "business", "productivity"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Aujourd’hui", short_name: "Aujourd’hui", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Recherche multilingue", short_name: "Recherche", url: "/recherche", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Tableau de bord", short_name: "Tableau de bord", url: "/tableau-de-bord", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        // Coquille de l'application disponible hors ligne
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Images des articles (autres domaines) : affichage hors ligne des articles déjà vus
            urlPattern: ({ request, sameOrigin }) => request.destination === "image" && !sameOrigin,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images-articles",
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Les appels à l'API ne sont jamais mis en cache (données liées à la session).
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
