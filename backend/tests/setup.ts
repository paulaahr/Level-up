import { afterEach, vi } from "vitest";

// Las pruebas unitarias no cargan configuración privada ni el arranque de la API.
vi.mock("dotenv/config", () => ({}));

afterEach(() => {
  vi.useRealTimers();
});
