import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// Hanya aktif saat dev (apply: 'serve'), tidak ikut saat build/deploy
function devLogger() {
  return {
    name: "dev-logger",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__log", (req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const { level, msg } = JSON.parse(body);
            const tag =
              level === "error"
                ? "ERROR"
                : level === "warn"
                  ? "WARN "
                  : "INFO ";
            console.log(`[app ${tag}] ${msg}`);
          } catch {}
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    vue(),
    devLogger(),
    VitePWA({
      registerType: "prompt", // versi baru tidak langsung menimpa; pengguna menekan "Perbarui"
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon-180x180.png",
        "logo.svg",
      ],
      manifest: {
        name: "Rizqy Barokah Fried Chicken",
        short_name: "Rizqy Barokah",
        description:
          "Pencatatan operasional Rizqy Barokah Fried Chicken (prototipe)",
        lang: "id",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#d9480f",
        background_color: "#fff8f0",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
