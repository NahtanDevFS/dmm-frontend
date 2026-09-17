import { describe, expect, it } from "vitest";
import { normalizarTelefono, telefonoValido } from "../telefono";

describe("normalizarTelefono", () => {
  it("deja igual un número ya limpio de ocho dígitos", () => {
    expect(normalizarTelefono("55123344")).toBe("55123344");
  });

  it("quita espacios", () => {
    expect(normalizarTelefono("5512 3344")).toBe("55123344");
  });

  it("quita guiones y paréntesis", () => {
    expect(normalizarTelefono("5512-3344")).toBe("55123344");
    expect(normalizarTelefono("(5512) 3344")).toBe("55123344");
  });

  it("quita el prefijo +502", () => {
    expect(normalizarTelefono("+502 5512 3344")).toBe("55123344");
  });

  it("quita el prefijo 502 sin el signo +", () => {
    expect(normalizarTelefono("502 5512 3344")).toBe("55123344");
  });

  it("recorta espacios en los extremos", () => {
    expect(normalizarTelefono("  55123344  ")).toBe("55123344");
  });

  it("no toca dígitos internos que casualmente empiecen con 502", () => {
    // El prefijo solo se quita al inicio de la cadena. Un número real que
    // arrancara con 502 sin ser el prefijo del país no existe en Guatemala
    // (los ocho dígitos empiezan en 2,3,4,5,6,7), pero la función no debe
    // comerse dígitos que no estén al principio.
    expect(normalizarTelefono("12345028")).toBe("12345028");
  });
});

describe("telefonoValido", () => {
  it("acepta ocho dígitos exactos", () => {
    expect(telefonoValido("55123344")).toBe(true);
  });

  it("acepta un número escrito con formato humano", () => {
    expect(telefonoValido("+502 5512-3344")).toBe(true);
  });

  it("rechaza menos de ocho dígitos", () => {
    expect(telefonoValido("5512334")).toBe(false);
  });

  it("rechaza más de ocho dígitos", () => {
    expect(telefonoValido("551233445")).toBe(false);
  });

  it("rechaza cadena vacía", () => {
    expect(telefonoValido("")).toBe(false);
  });

  it("rechaza letras", () => {
    expect(telefonoValido("5512abcd")).toBe(false);
  });
});
