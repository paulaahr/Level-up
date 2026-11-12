import assert from "node:assert/strict";

// El globalTeardown se ejecuta antes del cierre de webServer de Playwright.
// Se exige confirmación del proceso local: no se transforma un fallo en éxito.
export async function confirmarCierre(solicitar = fetch) {
  const respuesta = await solicitar(
    "http://127.0.0.1:3187/__pruebas__/cerrar",
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    },
  );
  assert.equal(
    respuesta.status,
    200,
    "El entorno aislado no confirmó su cierre",
  );
  const confirmacion = await respuesta.json();
  assert.equal(
    confirmacion.cerrado,
    true,
    "MongoDB aislado no confirmó detención y limpieza",
  );
}

export default async function cerrarIntegracion() {
  await confirmarCierre();
}
