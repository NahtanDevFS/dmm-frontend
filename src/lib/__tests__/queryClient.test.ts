import { describe, expect, it } from "vitest";
import type { AxiosError } from "axios";
import { convieneReintentar } from "../queryClient";

function errorConEstado(status: number | undefined): unknown {
  return {
    isAxiosError: true,
    response: status === undefined ? undefined : { status },
  } as unknown as AxiosError;
}

describe("convieneReintentar", () => {
  it("no reintenta errores de validación (400)", () => {
    expect(convieneReintentar(errorConEstado(400))).toBe(false);
  });

  it("no reintenta sesión inválida (401)", () => {
    expect(convieneReintentar(errorConEstado(401))).toBe(false);
  });

  it("no reintenta falta de permiso (403)", () => {
    expect(convieneReintentar(errorConEstado(403))).toBe(false);
  });

  it("no reintenta recurso inexistente (404)", () => {
    expect(convieneReintentar(errorConEstado(404))).toBe(false);
  });

  it("no reintenta conflicto de estado (409): insistir no cambia el mundo", () => {
    expect(convieneReintentar(errorConEstado(409))).toBe(false);
  });

  it("no reintenta error de validación de negocio (422)", () => {
    expect(convieneReintentar(errorConEstado(422))).toBe(false);
  });

  it("sí reintenta un error de servidor no listado, como 500", () => {
    expect(convieneReintentar(errorConEstado(500))).toBe(true);
  });

  it("sí reintenta un error de servidor 503", () => {
    expect(convieneReintentar(errorConEstado(503))).toBe(true);
  });

  it("sí reintenta cuando la petición no obtuvo respuesta (red caída)", () => {
    expect(convieneReintentar(errorConEstado(undefined))).toBe(true);
  });

  it("no reintenta si el error no es de axios", () => {
    expect(convieneReintentar(new Error("fallo interno"))).toBe(false);
  });
});
