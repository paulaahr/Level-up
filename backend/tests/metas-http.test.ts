import { describe, it } from "vitest";

// T-05: casos previstos, pendientes de T-03, CRUD y T-01 integración.
// No hay peticiones HTTP, colección conectada o persistencia simulada como real.
// Usar después un replica set aislado y snapshot previo de la meta completa.
describe("T-05: contratos y persistencia — integración pendiente", () => {
  // Crear y releer: createdAt y updatedAt válidos; después de actualizar,
  // createdAt estable y updatedAt posterior. La inicialización en memoria
  // del modelo no sustituye esta verificación con persistencia real.
  it.todo(
    "CA-E2-01: crear/consultar meta con timestamps persistidos y actualizados",
  );

  it.todo(
    "CA-E2-03: horas inválidas responden 400 y no alteran la meta persistida",
  );
  it.todo(
    "CA-E2-04: días inválidos responden 400 y no alteran la meta persistida",
  );
  it.todo(
    "CA-E2-05: seis hitos responden 400 sin reemplazo parcial del arreglo",
  );
  it.todo(
    "CA-E2-06: hito inválido responde 400 y conserva todos los campos previos",
  );
});
