import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuración explícita para build/revisión aislados: nunca carga .env.
export default defineConfig({
  envDir: false,
  plugins: [react()],
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("/api") },
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
