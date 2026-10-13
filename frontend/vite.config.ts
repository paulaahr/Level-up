import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy hacia el backend de Express (Semana 6), para evitar errores de CORS
// sin tener que instalar el middleware cors() en el servidor.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
