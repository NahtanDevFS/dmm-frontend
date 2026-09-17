import { describe, expect, it } from "vitest";
import { esFlujoDeAutenticacion } from "../axiosClient";

describe("esFlujoDeAutenticacion", () => {
  it("reconoce auth/login", () => {
    expect(esFlujoDeAutenticacion("auth/login")).toBe(true);
  });

  it("reconoce auth/me", () => {
    expect(esFlujoDeAutenticacion("auth/me")).toBe(true);
  });

  it("reconoce auth/logout", () => {
    expect(esFlujoDeAutenticacion("auth/logout")).toBe(true);
  });

  it("reconoce la ruta aunque venga con la baseURL completa delante", () => {
    // axios guarda en error.config.url la ruta relativa tal como se pidió,
    // pero si en algún punto viniera con el dominio completo delante, el
    // chequeo por includes() debe seguir encontrándola.
    expect(esFlujoDeAutenticacion("http://localhost:4000/api/auth/me")).toBe(
      true,
    );
  });

  it("no confunde otras rutas de negocio con las de autenticación", () => {
    expect(esFlujoDeAutenticacion("personas")).toBe(false);
    expect(esFlujoDeAutenticacion("solicitudes/lista-espera")).toBe(false);
  });

  it("da falso con undefined", () => {
    expect(esFlujoDeAutenticacion(undefined)).toBe(false);
  });
});
