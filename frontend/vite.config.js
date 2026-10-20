// frontend/vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { contentSecurityPolicy } from "./security-policy.js";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "production-content-security-policy",
      apply: "build",
      transformIndexHtml() {
        const env = loadEnv(mode, process.cwd(), "VITE_");
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: contentSecurityPolicy(
                process.env.VITE_API_URL || env.VITE_API_URL || "/api",
              ),
            },
            injectTo: "head-prepend",
          },
        ];
      },
    },
  ],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          animation: ["framer-motion"],
          charts: ["recharts"],
        },
      },
    },
  },
}));
