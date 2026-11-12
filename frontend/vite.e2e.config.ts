import type { UserConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuración explícita para build/revisión aislados: nunca carga .env.
// El bloqueo efectivo para Vite 5 se aplica por InlineConfig.envFile en el lanzador.
const config = {
  envDir: false,
  plugins: [react()],
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("/api") },
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
} satisfies Omit<UserConfig, "envDir"> & { envDir: false };
export default config;
