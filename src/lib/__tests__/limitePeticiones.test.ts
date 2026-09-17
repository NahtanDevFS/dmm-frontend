import { describe, expect, it } from "vitest";
import type { AxiosError } from "axios";
import { intentosRestantes } from "../limitePeticiones";

function errorConCabecera(cabecera: string | string[] | undefined): unknown {
  return {
    isAxiosError: true,
    response: {
      status: 429,
      headers: cabecera === undefined ? {} : { ratelimit: cabecera },
      data: {},
      statusText: "",
      config: {},
    },
    config: {},
  } as unknown as AxiosError;
}

describe("intentosRestantes", () => {
  it("lee el remanente en formato draft-8", () => {
    expect(intentosRestantes(errorConCabecera('"login"; r=7; t=42'))).toBe(7);
  });

  it("lee el remanente en formato draft-7", () => {
    expect(
      intentosRestantes(errorConCabecera("limit=10, remaining=7, reset=42")),
    ).toBe(7);
  });

  it("con dos políticas encadenadas, devuelve la más restrictiva", () => {
    // Caso real documentado en el código: el login atraviesa el limitador
    // general (300/min) y el propio de login (10/15min). El navegador junta
    // las dos cabeceras con coma, y hay que quedarse con el mínimo, que es
    // el que de verdad va a bloquear.
    const cabecera = '"general"; r=299; t=60, "login"; r=9; t=900';
    expect(intentosRestantes(errorConCabecera(cabecera))).toBe(9);
  });

  it("el orden de las políticas no importa: siempre gana el menor remanente", () => {
    const cabecera = '"login"; r=9; t=900, "general"; r=299; t=60';
    expect(intentosRestantes(errorConCabecera(cabecera))).toBe(9);
  });

  it("da null si no hay cabecera ratelimit", () => {
    expect(intentosRestantes(errorConCabecera(undefined))).toBeNull();
  });

  it("da null si no es un error de axios", () => {
    expect(intentosRestantes(new Error("x"))).toBeNull();
  });

  it("da null si la cabecera no matchea ningún formato conocido", () => {
    expect(intentosRestantes(errorConCabecera("valor-sin-sentido"))).toBeNull();
  });

  it("soporta la cabecera ya unida como arreglo (varios valores repetidos)", () => {
    // Algunos clientes exponen cabeceras repetidas como arreglo en vez de
    // como una sola cadena unida por comas.
    const cabecera = ['"general"; r=299; t=60', '"login"; r=9; t=900'];
    expect(intentosRestantes(errorConCabecera(cabecera))).toBe(9);
  });
});
