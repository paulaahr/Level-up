import mongoose from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Se evalúa config/env.ts genuino. Solo se neutraliza el lector de archivos.
vi.mock("dotenv/config", () => ({}));
const { iniciarReplica } = require("../soporte/replica.cjs") as {
  iniciarReplica(
    nombre: string,
  ): Promise<{ uri: string; cerrar(): Promise<void> }>;
};
let replica: Awaited<ReturnType<typeof iniciarReplica>>;
beforeAll(async () => {
  replica = await iniciarReplica("level_up_configuracion");
}, 240000);
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("MONGODB_URI", replica.uri);
  vi.stubEnv("PORT", "3187");
  vi.stubEnv("FRONTEND_URL", "http://127.0.0.1:4175");
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(async () => {
  await mongoose.disconnect();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  if (replica) await replica.cerrar();
});

describe("T-02 / T-19: configuración genuina y conexión real sin dotenv ni Atlas", () => {
  it.each([
    ["CA-E2-54", "level_up_pruebas", "level_up_pruebas"],
    ["CA-E2-55", undefined, "level_up"],
  ])(
    "%s: selecciona la base real esperada",
    async (_criterio, configurada, esperada) => {
      vi.stubEnv("MONGODB_DB", configurada);
      expect(replica.uri).toMatch(/^mongodb:\/\/127\.0\.0\.1:\d+\//);
      const { env } = await import("../../src/config/env");
      const { conectarDB } = await import("../../src/conexionDB");
      expect(env.mongodbDb).toBe(esperada);
      await conectarDB();
      expect(mongoose.connection.readyState).toBe(1);
      expect(mongoose.connection.name).toBe(esperada);
      expect(mongoose.connection.host).toBe("127.0.0.1");
      expect((await mongoose.connection.db!.admin().ping()).ok).toBe(1);
    },
  );
});
