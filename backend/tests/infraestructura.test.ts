import { describe, expect, it, vi } from "vitest";

describe("T-01: infraestructura unitaria aislada", () => {
  it("permite controlar el reloj sin iniciar la aplicación", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T17:00:00.000Z"));

    expect(new Date().toISOString()).toBe("2026-11-11T17:00:00.000Z");
  });

  it("neutraliza la carga automática de dotenv/config", async () => {
    expect(await import("dotenv/config")).toEqual({});
  });
});
