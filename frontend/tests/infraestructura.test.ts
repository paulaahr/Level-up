import { expect, it } from "vitest";

it("T-01: DOM aislado y API sintética, sin archivos de entorno", () => {
  expect(document.createElement("button").tagName).toBe("BUTTON");
  expect(import.meta.env.VITE_API_URL).toBe("http://api.level-up.test/api");
});
