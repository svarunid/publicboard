import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    watch: {
      ignored: ["**/.repos/**"],
    },
  },
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
    tsconfigPaths: true,
  },
  plugins: [tanstackStart(), tailwindcss(), viteReact()],
});
