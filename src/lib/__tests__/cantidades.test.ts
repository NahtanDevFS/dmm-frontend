import { describe, expect, it } from "vitest";
import { formatearCantidad } from "../cantidades";

describe("formatearCantidad", () => {
  it("antepone la cantidad a la unidad sin pluralizarla", () => {
    expect(formatearCantidad(20, "Tableta")).toBe("20 × Tableta");
    expect(formatearCantidad(3, "Caja de 100")).toBe("3 × Caja de 100");
  });

  it("agrupa los miles con el formato local", () => {
    expect(formatearCantidad(1500, "Unidad")).toBe(
      (1500).toLocaleString("es-GT") + " × Unidad",
    );
  });
});
