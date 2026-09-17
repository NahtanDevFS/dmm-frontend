import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../test/reactQuery";

vi.mock("../../api/axiosClient", () => ({
  default: { get: vi.fn() },
}));

import axiosClient from "../../api/axiosClient";
import { useListadoPaginado, type Filtros } from "../useListadoPaginado";

const getMock = vi.mocked(axiosClient.get);

/** Respuesta de un sobre paginado con `total` filas y 5 devueltas. */
function sobre(total: number) {
  return {
    data: {
      total,
      limite: 50,
      desplazamiento: 0,
      hay_mas: total > 5,
      datos: Array.from({ length: Math.min(total, 5) }, (_, i) => ({ id: i })),
    },
  };
}

beforeEach(() => {
  getMock.mockReset();
  getMock.mockResolvedValue(sobre(0));
});

function renderizar(
  opciones: {
    filtros?: Filtros;
    limiteInicial?: number;
    habilitado?: boolean;
  } = {},
) {
  const client = crearQueryClientDePrueba();
  return renderHook(
    (props: { filtros?: Filtros }) =>
      useListadoPaginado<{ id: number }>({
        clave: "prueba",
        ruta: "prueba",
        limiteInicial: opciones.limiteInicial,
        habilitado: opciones.habilitado,
        ...props,
      }),
    {
      wrapper: envolverConQueryClient(client),
      initialProps: { filtros: opciones.filtros },
    },
  );
}

describe("useListadoPaginado — límite", () => {
  it("usa 50 por defecto si no se indica límite", async () => {
    renderizar();
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    const params = getMock.mock.calls[0][1]?.params as Record<string, unknown>;
    expect(params.limite).toBe(50);
  });

  it("recorta un límite mayor al máximo permitido (200)", async () => {
    renderizar({ limiteInicial: 500 });
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    const params = getMock.mock.calls[0][1]?.params as Record<string, unknown>;
    expect(params.limite).toBe(200);
  });

  it("sube un límite menor a 1 hasta 1", async () => {
    renderizar({ limiteInicial: 0 });
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    const params = getMock.mock.calls[0][1]?.params as Record<string, unknown>;
    expect(params.limite).toBe(1);
  });
});

describe("useListadoPaginado — filtros", () => {
  it("no manda a la petición los filtros vacíos, null o undefined", async () => {
    renderizar({
      filtros: { busqueda: "", comunidad_id: undefined, activo: null },
    });
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    const params = getMock.mock.calls[0][1]?.params as Record<string, unknown>;
    expect(params).not.toHaveProperty("busqueda");
    expect(params).not.toHaveProperty("comunidad_id");
    expect(params).not.toHaveProperty("activo");
  });

  it("sí manda los filtros con valor, convertidos a string", async () => {
    renderizar({ filtros: { comunidad_id: 3, activo: true } });
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    const params = getMock.mock.calls[0][1]?.params as Record<string, unknown>;
    expect(params.comunidad_id).toBe("3");
    expect(params.activo).toBe("true");
  });

  it("vuelve a la primera página cuando cambian los filtros", async () => {
    const { result, rerender } = renderizar({ filtros: { comunidad_id: 1 } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.irAPagina(3));
    // No hace falta esperar la petición de la página 3: lo que importa es
    // que, al cambiar el filtro, el desplazamiento vuelva a 0 sin importar
    // dónde estaba.
    rerender({ filtros: { comunidad_id: 2 } });

    await waitFor(() => expect(result.current.desplazamiento).toBe(0));
  });

  it("no reinicia la página si el filtro se vuelve a pasar con el mismo valor", async () => {
    getMock.mockResolvedValue(sobre(500)); // suficientes filas para 3 páginas, desde el primer render
    const { result, rerender } = renderizar({ filtros: { comunidad_id: 1 } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.irAPagina(3));
    await waitFor(() => expect(result.current.paginaActual).toBe(3));

    // Mismo objeto de filtros en contenido, aunque sea una referencia nueva.
    rerender({ filtros: { comunidad_id: 1 } });

    // No debe volver a la página 1 solo porque React volvió a renderizar.
    expect(result.current.paginaActual).toBe(3);
  });
});

describe("useListadoPaginado — navegación", () => {
  it("irAPagina no deja ir más allá de la última página", async () => {
    getMock.mockResolvedValue(sobre(120)); // 50 por página → 3 páginas
    const { result } = renderizar();
    await waitFor(() => expect(result.current.totalPaginas).toBe(3));

    act(() => result.current.irAPagina(99));
    await waitFor(() => expect(result.current.paginaActual).toBe(3));
  });

  it("irAPagina no deja ir antes de la página 1", async () => {
    getMock.mockResolvedValue(sobre(120));
    const { result } = renderizar();
    await waitFor(() => expect(result.current.totalPaginas).toBe(3));

    act(() => result.current.irAPagina(-5));
    await waitFor(() => expect(result.current.paginaActual).toBe(1));
  });

  it("siguiente no avanza si el servidor dice que no hay más filas", async () => {
    getMock.mockResolvedValue(sobre(3)); // menos que el límite: hay_mas = false
    const { result } = renderizar();
    await waitFor(() => expect(result.current.hayMas).toBe(false));

    act(() => result.current.siguiente());
    expect(result.current.desplazamiento).toBe(0);
  });

  it("anterior no baja del desplazamiento 0", async () => {
    const { result } = renderizar();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.anterior());
    expect(result.current.desplazamiento).toBe(0);
  });

  it("reiniciar vuelve el desplazamiento a 0", async () => {
    getMock.mockResolvedValue(sobre(500));
    const { result } = renderizar();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.irAPagina(3));
    await waitFor(() => expect(result.current.paginaActual).toBe(3));

    act(() => result.current.reiniciar());
    await waitFor(() => expect(result.current.desplazamiento).toBe(0));
  });
});

describe("useListadoPaginado — datos", () => {
  it("nunca da undefined en datos, aunque la consulta no haya resuelto", () => {
    getMock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderizar();
    expect(result.current.datos).toEqual([]);
  });

  it("no consulta si habilitado es falso", async () => {
    renderizar({ habilitado: false });
    await new Promise((r) => setTimeout(r, 10));
    expect(getMock).not.toHaveBeenCalled();
  });

  it("calcula totalPaginas como mínimo 1, incluso con total 0", async () => {
    getMock.mockResolvedValue(sobre(0));
    const { result } = renderizar();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.totalPaginas).toBe(1);
  });
});
