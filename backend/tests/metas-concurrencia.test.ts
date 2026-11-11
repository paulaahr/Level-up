import { describe, it } from "vitest";

// T-06: planificación de integración, NO una garantía ya verificada.
// Pendiente de T-01 integración y T-05. Ejecutar en un replica set efímero,
// con datos sintéticos, índice realmente creado y sin usar MongoDB Atlas.
// Estas pruebas NO pertenecen a test:unit; no se conectan ni preparan datos aquí.
describe("T-06: unicidad activa — integración pendiente con MongoDB", () => {
  // Preparar un juego sin meta, esperar Meta.init() y lanzar dos operaciones
  // simultáneas. Comprobar una sola activa en DB; la operación rechazada debe
  // producir E11000 en persistencia y 409 en la futura capa HTTP.
  it.todo(
    "CA-E2-09: dos creaciones concurrentes dejan una activa y un conflicto",
  );

  // Preparar varias metas inactivas del juego A y activa del B. Crear activa
  // para A y comprobar que las inactivas y el juego B se conservan intactos.
  it.todo("CA-E2-10: inactivas múltiples y metas de otro juego no bloquean");

  // Preparar activa e inactiva de A. Intentar segunda activa y reactivación
  // de la anterior; comprobar conflicto y que la vigente no se modifica.
  it.todo(
    "CA-E2-11: crear o reactivar una segunda activa no altera la vigente",
  );
});
