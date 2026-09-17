import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Paginacion from "../Paginacion";
import { ventanaDePaginas } from "../ventanaDePaginas";

describe("ventanaDePaginas", () => {
  it("muestra todas las páginas si son 7 o menos", () => {
    expect(ventanaDePaginas(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(ventanaDePaginas(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("con más de 7 páginas, siempre incluye la primera y la última", () => {
    const ventana = ventanaDePaginas(5, 20);
    expect(ventana[0]).toBe(1);
    expect(ventana[ventana.length - 1]).toBe(20);
  });

  it("incluye la página actual y sus vecinas inmediatas", () => {
    const ventana = ventanaDePaginas(10, 20);
    expect(ventana).toContain(9);
    expect(ventana).toContain(10);
    expect(ventana).toContain(11);
  });

  it("pone una elipsis en los huecos", () => {
    const ventana = ventanaDePaginas(10, 20);
    expect(ventana).toContain("…");
  });

  it("no repite la elipsis cuando el hueco es de una sola página", () => {
    // Entre la página 1 y la vecina 2 de la actual (si actual=3) no hay
    // hueco real: 1, 2, 3, 4 son consecutivas y no debe meterse un "…" ahí.
    const ventana = ventanaDePaginas(3, 20);
    expect(ventana).toEqual([1, 2, 3, 4, "…", 20]);
  });

  it("no pone elipsis al principio si la actual está cerca del inicio", () => {
    const ventana = ventanaDePaginas(2, 20);
    expect(ventana[0]).toBe(1);
    expect(ventana[1]).not.toBe("…");
  });

  it("no pone elipsis al final si la actual está cerca del final", () => {
    const ventana = ventanaDePaginas(19, 20);
    expect(ventana[ventana.length - 1]).toBe(20);
    expect(ventana[ventana.length - 2]).not.toBe("…");
  });

  it("no duplica páginas cuando la actual es la primera o la última", () => {
    const ventana = ventanaDePaginas(1, 20);
    // 1 aparece una sola vez aunque sea tanto "primera" como "actual".
    expect(ventana.filter((p) => p === 1)).toHaveLength(1);
  });

  it("con página actual en el centro exacto de un total grande, ambos huecos aparecen", () => {
    const ventana = ventanaDePaginas(50, 100);
    const elipsis = ventana.filter((p) => p === "…");
    expect(elipsis).toHaveLength(2);
  });
});

function propsBase(overrides: Partial<Parameters<typeof Paginacion>[0]> = {}) {
  return {
    total: 120,
    limite: 50,
    desplazamiento: 0,
    paginaActual: 1,
    totalPaginas: 3,
    irAPagina: vi.fn(),
    anterior: vi.fn(),
    siguiente: vi.fn(),
    ...overrides,
  };
}

describe("Paginacion — render", () => {
  it("no renderiza nada si total es 0", () => {
    const { container } = render(<Paginacion {...propsBase({ total: 0 })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el rango de resultados de la página actual", () => {
    render(
      <Paginacion
        {...propsBase({ desplazamiento: 0, limite: 50, total: 120 })}
      />,
    );
    expect(
      screen.getByText(/Mostrando 1 a 50 de 120 registros/),
    ).toBeInTheDocument();
  });

  it("usa singular cuando total es 1", () => {
    render(
      <Paginacion
        {...propsBase({
          total: 1,
          totalPaginas: 1,
          desplazamiento: 0,
          limite: 50,
        })}
      />,
    );
    expect(screen.getByText(/1 registro$/)).toBeInTheDocument();
  });

  it("el último de la página no excede el total, en la última página parcial", () => {
    // 120 registros, 50 por página: la página 3 va de 101 a 120, no a 150.
    render(
      <Paginacion
        {...propsBase({
          desplazamiento: 100,
          limite: 50,
          total: 120,
          paginaActual: 3,
        })}
      />,
    );
    expect(screen.getByText(/Mostrando 101 a 120 de 120/)).toBeInTheDocument();
  });

  it("marca la página actual con aria-current", () => {
    render(<Paginacion {...propsBase({ paginaActual: 2 })} />);
    const boton = screen.getByRole("button", { name: "Página 2" });
    expect(boton).toHaveAttribute("aria-current", "page");
  });

  it("no marca aria-current en las páginas que no son la actual", () => {
    render(<Paginacion {...propsBase({ paginaActual: 2 })} />);
    const boton = screen.getByRole("button", { name: "Página 1" });
    expect(boton).not.toHaveAttribute("aria-current");
  });
});

describe("Paginacion — botones anterior/siguiente", () => {
  it("deshabilita 'Anterior' en la primera página", () => {
    render(<Paginacion {...propsBase({ paginaActual: 1 })} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  });

  it("habilita 'Anterior' fuera de la primera página", () => {
    render(<Paginacion {...propsBase({ paginaActual: 2 })} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
  });

  it("deshabilita 'Siguiente' en la última página", () => {
    render(<Paginacion {...propsBase({ paginaActual: 3, totalPaginas: 3 })} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("deshabilita todos los controles mientras cargando es verdadero", () => {
    render(<Paginacion {...propsBase({ paginaActual: 2, cargando: true })} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Página 1" })).toBeDisabled();
  });
});

describe("Paginacion — interacción", () => {
  it("llama a siguiente al hacer clic en 'Siguiente'", async () => {
    const siguiente = vi.fn();
    const usuario = userEvent.setup();
    render(<Paginacion {...propsBase({ paginaActual: 1, siguiente })} />);
    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(siguiente).toHaveBeenCalledTimes(1);
  });

  it("llama a anterior al hacer clic en 'Anterior'", async () => {
    const anterior = vi.fn();
    const usuario = userEvent.setup();
    render(<Paginacion {...propsBase({ paginaActual: 2, anterior })} />);
    await usuario.click(screen.getByRole("button", { name: "Anterior" }));
    expect(anterior).toHaveBeenCalledTimes(1);
  });

  it("llama a irAPagina con el número correcto al hacer clic en una página", async () => {
    const irAPagina = vi.fn();
    const usuario = userEvent.setup();
    render(<Paginacion {...propsBase({ paginaActual: 1, irAPagina })} />);
    await usuario.click(screen.getByRole("button", { name: "Página 2" }));
    expect(irAPagina).toHaveBeenCalledWith(2);
  });

  it("no dispara nada al hacer clic en un botón deshabilitado", async () => {
    const anterior = vi.fn();
    const usuario = userEvent.setup();
    render(<Paginacion {...propsBase({ paginaActual: 1, anterior })} />);
    await usuario.click(screen.getByRole("button", { name: "Anterior" }));
    expect(anterior).not.toHaveBeenCalled();
  });
});
