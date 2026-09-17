import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LineaEnEspera } from "../../../api/donaciones";

/**
 * Se mockea el módulo api/donaciones entero, no axios directamente: lo que
 * hay que controlar aquí es qué devuelve listarListaEspera, y mockear un
 * nivel más abajo (axiosClient) obligaría a simular también la forma exacta
 * de la respuesta HTTP sin aportar nada a lo que este test verifica.
 */
vi.mock("../../../api/donaciones", () => ({
  listarListaEspera: vi.fn(),
  EN_ESPERA_DE_STOCK: "PENDIENTE_ADQUISICION",
}));

import { listarListaEspera } from "../../../api/donaciones";
import { contarEnEsperaDe } from "../listaEspera";

const listarListaEsperaMock = vi.mocked(listarListaEspera);

function linea(overrides: Partial<LineaEnEspera> = {}): LineaEnEspera {
  return {
    detalle_solicitud_id: 1,
    solicitud_id: 1,
    persona_id: 1,
    persona_nombre_completo: "María López",
    insumo_nombre: "Jabón",
    cantidad_requerida: 2,
    cantidad_entregada: 0,
    estado: "PENDIENTE_ADQUISICION",
    fecha_ingreso_espera: "2026-01-01",
    dias_esperando: 3,
    ...overrides,
  };
}

beforeEach(() => {
  listarListaEsperaMock.mockReset();
});

describe("contarEnEsperaDe", () => {
  it("cuenta las líneas que coinciden en nombre exacto y están pendientes de adquisición", async () => {
    listarListaEsperaMock.mockResolvedValue([
      linea({ insumo_nombre: "Jabón" }),
      linea({ insumo_nombre: "Jabón" }),
    ]);
    expect(await contarEnEsperaDe("Jabón")).toBe(2);
  });

  it("descarta coincidencias parciales que el ILIKE del servidor trajo de más", async () => {
    // El caso documentado: el servidor filtra por ILIKE, así que buscar
    // "Jabón" también trae "Jabón líquido". Esta función debe afinar por
    // nombre exacto y no contar esa línea.
    listarListaEsperaMock.mockResolvedValue([
      linea({ insumo_nombre: "Jabón" }),
      linea({ insumo_nombre: "Jabón líquido" }),
    ]);
    expect(await contarEnEsperaDe("Jabón")).toBe(1);
  });

  it("no cuenta líneas con entrega parcial, aunque el nombre coincida", async () => {
    // PENDIENTE_ENTREGA_PARCIAL ya tiene stock asignado y no es lo que
    // sp_procesar_donaciones_pendientes promueve; solo cuenta lo pendiente
    // de adquisición.
    listarListaEsperaMock.mockResolvedValue([
      linea({ insumo_nombre: "Jabón", estado: "PENDIENTE_ENTREGA_PARCIAL" }),
    ]);
    expect(await contarEnEsperaDe("Jabón")).toBe(0);
  });

  it("da 0 cuando no hay ninguna línea en espera", async () => {
    listarListaEsperaMock.mockResolvedValue([]);
    expect(await contarEnEsperaDe("Jabón")).toBe(0);
  });

  it("nunca lanza: si la petición falla, da null", async () => {
    listarListaEsperaMock.mockRejectedValue(new Error("red caída"));
    expect(await contarEnEsperaDe("Jabón")).toBeNull();
  });

  it("llama a listarListaEspera con el nombre del insumo", async () => {
    listarListaEsperaMock.mockResolvedValue([]);
    await contarEnEsperaDe("Paracetamol");
    expect(listarListaEsperaMock).toHaveBeenCalledWith("Paracetamol");
  });
});
