import { describe, expect, it } from "vitest";
import { calcularUnidadesBase } from "../calculo";

describe("calcularUnidadesBase", () => {
  it("multiplica cantidad por unidades por presentación", () => {
    expect(calcularUnidadesBase(3, 100)).toBe(300);
  });

  it("trunca hacia abajo cuando la presentación es grande y el resto no alcanza una unidad completa", () => {
    // El caso documentado en el código: media caja de cien entra entera.
    expect(calcularUnidadesBase(2.5, 100)).toBe(250);
  });

  it("trunca y pierde unidades cuando la presentación es chica", () => {
    // Media caja de tres NO entra como 7.5, sino como 7: se pierde media
    // unidad que no vuelve a aparecer en ningún informe posterior.
    expect(calcularUnidadesBase(2.5, 3)).toBe(7);
  });

  it("da 0 con cantidad 0", () => {
    expect(calcularUnidadesBase(0, 100)).toBe(0);
  });

  it("da NaN si la cantidad no es un número finito", () => {
    expect(Number.isNaN(calcularUnidadesBase(Number.NaN, 100))).toBe(true);
    expect(Number.isNaN(calcularUnidadesBase(Infinity, 100))).toBe(true);
  });

  it("da NaN si las unidades por presentación no son un número finito", () => {
    expect(Number.isNaN(calcularUnidadesBase(3, Number.NaN))).toBe(true);
  });

  it("acepta presentación de una sola unidad (base = presentación)", () => {
    expect(calcularUnidadesBase(5, 1)).toBe(5);
  });
});
