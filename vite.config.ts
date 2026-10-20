import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";

// Plain Vite config. Nitro picks the Netlify preset automatically when built on Netlify.
// src/server.ts is the SSR error wrapper (bundled server entry).
export default defineConfig({
  server: { host: "::", port: 8080 },
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
    ignoreOutdatedRequests: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    nitro(),
    viteReact(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null, // wrapper module is the only registrar
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        manifest: {
          name: "PGG",
          short_name: "PGG",
          description: "PGG field photo documentation tool with floor plan pins, room locations, notes, photos, and export.",
          id: "/survey.html?pwa=pgg-v6",
          start_url: "/survey.html?pwa=pgg-v6",
          scope: "/",
          display: "standalone",
          orientation: "any",
          background_color: "#f7f5f2",
          theme_color: "#8b5e34",
          icons: [
            { src: "/icon-pgg-v2-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-pgg-v2-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-pgg-v2-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icon-pgg-v2-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        devOptions: { enabled: false },
        injectManifest: {
          swDest: resolve(process.cwd(), "dist/sw.js"),
          // Precache hashed JS/CSS/assets only. HTML is fetched network-first
          // so deploys are visible immediately; the SW caches the latest HTML
          // for offline fallback on first visit.
          globPatterns: ["**/*.{js,css,ico,png,svg,webmanifest}"],
          globIgnores: ["**/node_modules/**", "**/*.map", "sw.js", "workbox-*.js", "**/vendor/tesseract/**"],
          // TanStack Start emits `client/` and `server/` subdirs, but the
          // deployed origin serves those files at the root. Rewrite the
          // precache manifest so cached URLs match what the browser fetches.
          manifestTransforms: [
            async (entries) => {
              const manifest = entries
                .filter((e) => !e.url.startsWith("server/"))
                .map((e) =>
                  e.url.startsWith("client/")
                    ? { ...e, url: e.url.slice("client/".length) }
                    : e,
                );
              return { manifest, warnings: [] };
            },
          ],
          additionalManifestEntries: [
            // `/` is the React shell route; precache it so the root loads offline.
            { url: "/", revision: null },
            { url: "/survey.html", revision: null },
          ],
        },
      }),
  ],
});
