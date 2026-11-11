import { beforeEach, describe, expect, it, vi } from "vitest";

const conexion = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  colecciones: vi.fn().mockResolvedValue([]),
}));

vi.mock("mongoose", () => ({
  default: {
    connect: conexion.connect,
    connection: {
      name: "base_controlada",
      host: "host_controlado",
      db: { listCollections: () => ({ toArray: conexion.colecciones }) },
    },
  },
}));

describe("T-02 / D-04: conexión con configuración controlada, sin MongoDB", () => {
  const uriControlada = "mongodb://127.0.0.1:27017/base_controlada";

  beforeEach(() => {
    vi.resetModules();
    conexion.connect.mockResolvedValue(undefined);
    conexion.colecciones.mockResolvedValue([]);
    vi.stubEnv("MONGODB_URI", uriControlada);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("CA-E2-54: utiliza el nombre explícito resuelto por la configuración", async () => {
    vi.stubEnv("MONGODB_DB", "level_up_pruebas");
    const { conectarDB } = await import("../src/conexionDB");

    await conectarDB();

    expect(conexion.connect).toHaveBeenCalledExactlyOnceWith(uriControlada, {
      dbName: "level_up_pruebas",
    });
  });

  it("CA-E2-55: conserva el nombre por defecto cuando no se configura otro", async () => {
    vi.stubEnv("MONGODB_DB", undefined);
    const { conectarDB } = await import("../src/conexionDB");

    await conectarDB();

    expect(conexion.connect).toHaveBeenCalledExactlyOnceWith(uriControlada, {
      dbName: "level_up",
    });
  });
});
