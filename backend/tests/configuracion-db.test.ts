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
  const limitesPorEtapa = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    waitQueueTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  };

  beforeEach(() => {
    vi.resetModules();
    conexion.connect.mockResolvedValue(undefined);
    conexion.colecciones.mockResolvedValue([]);
    vi.stubEnv("MONGODB_URI", uriControlada);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("CA-E2-54: utiliza el nombre explícito resuelto por la configuración", async () => {
    vi.stubEnv("MONGODB_DB", "level_up_pruebas");
    const { conectarDB } = await import("../src/conexionDB");

    await conectarDB();

    expect(conexion.connect).toHaveBeenCalledExactlyOnceWith(uriControlada, {
      dbName: "level_up_pruebas",
      ...limitesPorEtapa,
    });
  });

  it("CA-E2-55: conserva el nombre por defecto cuando no se configura otro", async () => {
    vi.stubEnv("MONGODB_DB", undefined);
    const { conectarDB } = await import("../src/conexionDB");

    await conectarDB();

    expect(conexion.connect).toHaveBeenCalledExactlyOnceWith(uriControlada, {
      dbName: "level_up",
      ...limitesPorEtapa,
    });
  });

  it("T-06: transmite solo dbName y límites por etapa, sin activar CSOT", async () => {
    vi.stubEnv("MONGODB_DB", "base_aislada");
    const { conectarDB } = await import("../src/conexionDB");

    await conectarDB();

    expect(conexion.connect).toHaveBeenCalledExactlyOnceWith(uriControlada, {
      dbName: "base_aislada",
      ...limitesPorEtapa,
    });
  });

  it.each([
    "timeoutMS=10000",
    "TIMEOUTMS=0",
    "timeoutMS=",
    "timeoutMode=iteration",
    "TIMEOUTMODE=cursorLifetime",
    "defaultTimeoutMS=10000",
    "DefaultTimeoutMs=0",
    "%74imeoutMS=10000",
  ])(
    "T-06: rechaza CSOT heredado de la URI antes de conectar: %s",
    async (opcion) => {
      const uri = `mongodb://usuario:clave_sintetica@host-a:27017,host-b:27017/base?replicaSet=rs0&${opcion}`;
      vi.stubEnv("MONGODB_URI", uri);
      const { conectarDB } = await import("../src/conexionDB");

      const operacion = conectarDB();
      await expect(operacion).rejects.toThrow(/CSOT/);
      await expect(operacion).rejects.not.toThrow("usuario");
      await expect(operacion).rejects.not.toThrow("clave_sintetica");
      await expect(operacion).rejects.not.toThrow(uri);

      expect(conexion.connect).not.toHaveBeenCalled();
      expect(conexion.colecciones).not.toHaveBeenCalled();
      const registros = vi
        .mocked(console.error)
        .mock.calls.flat()
        .map(String)
        .join(" ");
      expect(registros).not.toContain("usuario");
      expect(registros).not.toContain("clave_sintetica");
      expect(registros).not.toContain(uri);
    },
  );

  it("T-06: acepta URI de replica set con opciones ajenas a CSOT", async () => {
    const uri =
      "mongodb://host-a:27017,host-b:27017/base?replicaSet=rs0&retryWrites=true";
    vi.stubEnv("MONGODB_URI", uri);
    vi.stubEnv("MONGODB_DB", "base_aislada");
    const { conectarDB } = await import("../src/conexionDB");

    await conectarDB();

    expect(conexion.connect).toHaveBeenCalledExactlyOnceWith(uri, {
      dbName: "base_aislada",
      ...limitesPorEtapa,
    });
  });
});
