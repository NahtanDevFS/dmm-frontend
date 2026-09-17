import { describe, expect, it } from "vitest";
import { formatearPeso, urlArchivo } from "../archivos";

describe("formatearPeso", () => {
  it("muestra bytes por debajo de 1 KB", () => {
    expect(formatearPeso(500)).toBe("500 B");
  });

  it("redondea a KB entre 1 KB y 1 MB", () => {
    expect(formatearPeso(1024)).toBe("1 KB");
    expect(formatearPeso(1536)).toBe("2 KB"); // 1.5 KB redondea a 2
  });

  it("muestra MB con un decimal desde 1 MB", () => {
    expect(formatearPeso(1024 * 1024)).toBe("1.0 MB");
    expect(formatearPeso(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });

  it("respeta el límite del backend expresado en bytes", () => {
    // TAMANO_MAXIMO son 8 MB; confirma que el formateo de ese límite exacto
    // es el número que se le muestra al usuario en el mensaje de validación.
    expect(formatearPeso(8 * 1024 * 1024)).toBe("8.0 MB");
  });
});

describe("urlArchivo", () => {
  it("concatena la base configurada con la ruta del archivo", () => {
    // import.meta.env.VITE_API_URL no está definida en el entorno de test
    // (no hay .env.test en el proyecto), así que aquí se confirma el
    // comportamiento de concatenación en sí, no un dominio concreto.
    const base = import.meta.env.VITE_API_URL;
    expect(urlArchivo("documentos/123/dpi-frontal.jpg")).toBe(
      `${base}/archivos/documentos/123/dpi-frontal.jpg`,
    );
  });
});
