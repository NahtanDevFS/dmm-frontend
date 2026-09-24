import { describe, expect, it } from "vitest";
import { etiquetaDe } from "../etiquetas";

describe("etiquetaDe", () => {
  it("traduce los identificadores conocidos, con tildes", () => {
    expect(etiquetaDe("PREFIERE_NO_DECIR")).toBe("Prefiere no decir");
    expect(etiquetaDe("CONYUGE")).toBe("Cónyuge");
    expect(etiquetaDe("TIO_A")).toBe("Tío(a)");
    expect(etiquetaDe("PENDIENTE_ADQUISICION")).toBe("Pendiente de adquisición");
    expect(etiquetaDe("NO_DEVUELTO")).toBe("No devuelto");
    expect(etiquetaDe("EMPLEADO_DMM")).toBe("Trabajo social");
    expect(etiquetaDe("DONACION")).toBe("Donación");
  });

  it("vuelve legible un identificador nuevo que nadie agregó al mapa", () => {
    expect(etiquetaDe("ALGO_NUEVO")).toBe("Algo nuevo");
    expect(etiquetaDe("SOBRINO_A")).toBe("Sobrino(a)");
  });

  it("deja igual lo que ya es legible y las siglas solas", () => {
    expect(etiquetaDe("DPI anverso")).toBe("DPI anverso");
    expect(etiquetaDe("Partida de nacimiento")).toBe("Partida de nacimiento");
    expect(etiquetaDe("Zacapa")).toBe("Zacapa");
    expect(etiquetaDe("DPI")).toBe("DPI");
  });

  it("tolera valores ausentes", () => {
    expect(etiquetaDe(undefined)).toBe("");
    expect(etiquetaDe(null)).toBe("");
  });
});
