import { URL, fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [
    federation({
      name: "processVabApp",
      filename: "remoteEntry.js",
      exposes: {
        "./ProcessVy": "./src/components/ProcessVy.vue",
      },
      shared: {
        vue: { singleton: true, requiredVersion: "^3.5.24" },
        "@fkui/vue": { singleton: true, requiredVersion: "^6.26.0" },
      },
      manifest: true,
      publicPath: "auto",
      dts: false,
    }),
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  preview: {
    port: process.env.VITE_APP_PORT ? parseInt(process.env.VITE_APP_PORT) : 3043,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:9006",
        changeOrigin: true,
      },
    },
    port: process.env.VITE_APP_PORT_DEV
      ? parseInt(process.env.VITE_APP_PORT_DEV)
      : 3042,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  base: "./",
  build: {
    target: "esnext",
    cssCodeSplit: false,
    chunkSizeWarningLimit: 800,
  },
});
