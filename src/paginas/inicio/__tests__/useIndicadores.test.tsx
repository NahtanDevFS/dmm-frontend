import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";

/**
 * Se mockea axiosClient, no el hook: lo que hay que verificar es la
 * derivación (contar por color a partir del arreglo crudo), que vive en
 * useCaducidades y no en la petición HTTP en sí.
 */
vi.mock("../../../api/axiosClient", () => ({
  default: { get: vi.fn() },
}));

import axiosClient from "../../../api/axiosClient";
import { useCaducidades } from "../useIndicadores";

const getMock = vi.mocked(axiosClient.get);

function lote(semaforo: string) {
  return {
    detalle_inventario_lote_id: 1,
    insumo_nombre: "x",
    fecha_caducidad: null,
    cantidad_disponible: 1,
    semaforo,
  };
}

function renderizar() {
  const client = crearQueryClientDePrueba();
  return renderHook(() => useCaducidades(), {
    wrapper: envolverConQueryClient(client),
  });
}

beforeEach(() => {
  getMock.mockReset();
});

describe("useCaducidades", () => {
  it("cuenta cada color por separado", async () => {
    getMock.mockResolvedValue({
      data: [
        lote("VERDE"),
        lote("VERDE"),
        lote("AMARILLO"),
        lote("ROJO"),
        lote("VENCIDO"),
        lote("VENCIDO"),
        lote("GRIS"),
      ],
    });

    const { result } = renderizar();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.verdes).toBe(2);
    expect(result.current.amarillos).toBe(1);
    expect(result.current.porVencer).toBe(1); // ROJO
    expect(result.current.vencidos).toBe(2);
    expect(result.current.sinFecha).toBe(1); // GRIS
  });

  it("no confunde ROJO (vence en menos de 3 meses) con AMARILLO (3-6 meses)", async () => {
    // Regresión directa de un bug real: en una iteración anterior las
    // etiquetas de la gráfica de pastel quedaron invertidas porque se
    // asumió el mapeo equivocado. Este test fija el contrato: ROJO va a
    // porVencer, AMARILLO va a amarillos, y no al revés.
    getMock.mockResolvedValue({
      data: [lote("ROJO"), lote("AMARILLO"), lote("AMARILLO")],
    });
    const { result } = renderizar();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.porVencer).toBe(1);
    expect(result.current.amarillos).toBe(2);
  });

  it("da todos los conteos en 0 mientras no hay datos", () => {
    getMock.mockImplementation(() => new Promise(() => {})); // nunca resuelve
    const { result } = renderizar();
    expect(result.current.verdes).toBe(0);
    expect(result.current.amarillos).toBe(0);
    expect(result.current.porVencer).toBe(0);
    expect(result.current.vencidos).toBe(0);
    expect(result.current.sinFecha).toBe(0);
  });

  it("da todos los conteos en 0 con una lista vacía", async () => {
    getMock.mockResolvedValue({ data: [] });
    const { result } = renderizar();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.verdes).toBe(0);
    expect(result.current.vencidos).toBe(0);
  });

  it("propaga el estado de error sin romper los conteos derivados", async () => {
    getMock.mockRejectedValue(new Error("red caída"));
    const { result } = renderizar();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.verdes).toBe(0);
  });
});
