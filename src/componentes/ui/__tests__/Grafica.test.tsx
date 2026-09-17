import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GraficaBarras, GraficaLinea, GraficaPastel } from "../Grafica";

/**
 * Recharts dibuja su SVG a partir del tamaño real del contenedor
 * (ResizeObserver + getBoundingClientRect), y jsdom siempre reporta 0×0. Por
 * eso estos tests no verifican barras, puntos ni arcos dibujados —no hay
 * forma fiable de hacerlo aquí sin mockear las dimensiones a mano, lo que
 * terminaría probando el mock y no el componente.
 *
 * Lo que sí es fiable y vale la pena cubrir: los estados vacíos (son texto
 * plano, sin Recharts de por medio), que el componente monte sin lanzar
 * cuando sí hay datos, y la leyenda del pastel, que es HTML propio y no
 * depende de que Recharts mida nada.
 */

describe("GraficaLinea — estado vacío", () => {
  it("muestra el mensaje por defecto con un arreglo vacío", () => {
    render(<GraficaLinea datos={[]} />);
    expect(screen.getByText("Sin datos en este período")).toBeInTheDocument();
  });

  it("muestra el mensaje vacío si todos los valores son cero", () => {
    // Caso real: un mes sin ninguna entrega registrada no debe verse como
    // una línea plana en cero, sino como "no hay datos".
    render(
      <GraficaLinea
        datos={[
          { etiqueta: "ene", valor: 0 },
          { etiqueta: "feb", valor: 0 },
        ]}
      />,
    );
    expect(screen.getByText("Sin datos en este período")).toBeInTheDocument();
  });

  it("acepta un mensaje vacío personalizado", () => {
    render(<GraficaLinea datos={[]} etiquetaVacio="Nada que mostrar" />);
    expect(screen.getByText("Nada que mostrar")).toBeInTheDocument();
  });

  it("no muestra el mensaje vacío si al menos un valor es distinto de cero", () => {
    render(
      <GraficaLinea
        datos={[
          { etiqueta: "ene", valor: 0 },
          { etiqueta: "feb", valor: 3 },
        ]}
      />,
    );
    expect(
      screen.queryByText("Sin datos en este período"),
    ).not.toBeInTheDocument();
  });
});

describe("GraficaBarras — estado vacío", () => {
  it("muestra el mensaje por defecto con un arreglo vacío", () => {
    render(<GraficaBarras datos={[]} />);
    expect(screen.getByText("Sin datos para mostrar")).toBeInTheDocument();
  });

  it("acepta un mensaje vacío personalizado", () => {
    render(<GraficaBarras datos={[]} etiquetaVacio="No hay categorías" />);
    expect(screen.getByText("No hay categorías")).toBeInTheDocument();
  });

  it("no muestra el mensaje vacío si hay datos, aunque el valor sea 0", () => {
    // A diferencia de la línea: una categoría con 0 unidades disponibles es
    // información real (agotada), no "sin datos".
    render(<GraficaBarras datos={[{ etiqueta: "Medicamentos", valor: 0 }]} />);
    expect(
      screen.queryByText("Sin datos para mostrar"),
    ).not.toBeInTheDocument();
  });
});

describe("GraficaPastel — estado vacío", () => {
  it("muestra el mensaje vacío con un arreglo vacío", () => {
    render(<GraficaPastel datos={[]} />);
    expect(screen.getByText("Sin datos para mostrar")).toBeInTheDocument();
  });

  it("muestra el mensaje vacío si el total de todas las porciones es cero", () => {
    render(
      <GraficaPastel
        datos={[
          { etiqueta: "Verde", valor: 0 },
          { etiqueta: "Rojo", valor: 0 },
        ]}
      />,
    );
    expect(screen.getByText("Sin datos para mostrar")).toBeInTheDocument();
  });

  it("no oculta la gráfica si una porción está en 0 pero otra no", () => {
    // Caso real documentado en el componente: "cero lotes vencidos" es
    // justo la información que se quiere confirmar de un vistazo, así que
    // una porción individual en 0 no debe esconder toda la gráfica.
    render(
      <GraficaPastel
        datos={[
          { etiqueta: "Verde", valor: 5 },
          { etiqueta: "Vencido", valor: 0 },
        ]}
      />,
    );
    expect(
      screen.queryByText("Sin datos para mostrar"),
    ).not.toBeInTheDocument();
  });
});

describe("GraficaPastel — leyenda", () => {
  it("lista cada porción con su etiqueta y valor", () => {
    render(
      <GraficaPastel
        datos={[
          { etiqueta: "Sin novedad (más de 6 meses)", valor: 12 },
          { etiqueta: "Vence en 3-6 meses", valor: 3 },
          { etiqueta: "Vence en menos de 3 meses", valor: 1 },
          { etiqueta: "Vencido", valor: 2 },
          { etiqueta: "Sin fecha de caducidad", valor: 7 },
        ]}
      />,
    );

    // El bug real que motivó reemplazar <Legend> de Recharts: con 5
    // etiquetas largas, esa componente cortaba las últimas por su altura
    // fija. Aquí se confirma que las cinco aparecen enteras en el DOM.
    expect(
      screen.getByText(/Sin novedad \(más de 6 meses\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Vence en 3-6 meses/)).toBeInTheDocument();
    expect(screen.getByText(/Vence en menos de 3 meses/)).toBeInTheDocument();
    expect(screen.getByText(/Vencido/)).toBeInTheDocument();
    expect(screen.getByText(/Sin fecha de caducidad/)).toBeInTheDocument();
  });

  it("muestra el valor de cada porción junto a su etiqueta", () => {
    render(<GraficaPastel datos={[{ etiqueta: "Masculino", valor: 42 }]} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it("formatea el valor con separador de miles en formato guatemalteco", () => {
    render(<GraficaPastel datos={[{ etiqueta: "Total", valor: 12345 }]} />);
    expect(screen.getByText(/12,345/)).toBeInTheDocument();
  });
});

describe("GraficaLinea / GraficaBarras / GraficaPastel — con datos, no lanzan", () => {
  it("GraficaLinea monta con datos reales", () => {
    expect(() =>
      render(
        <GraficaLinea
          datos={[
            { etiqueta: "abr", valor: 0 },
            { etiqueta: "may", valor: 3 },
          ]}
        />,
      ),
    ).not.toThrow();
  });

  it("GraficaBarras monta con datos reales, incluida una barra resaltada", () => {
    expect(() =>
      render(
        <GraficaBarras
          datos={[
            { etiqueta: "Medicamentos", valor: 120, resaltada: true },
            { etiqueta: "Alimentos", valor: 40 },
          ]}
        />,
      ),
    ).not.toThrow();
  });

  it("GraficaPastel monta con datos reales y colores explícitos", () => {
    expect(() =>
      render(
        <GraficaPastel
          datos={[
            { etiqueta: "Verde", valor: 5, color: "var(--color-success)" },
            { etiqueta: "Rojo", valor: 1, color: "var(--color-danger)" },
          ]}
        />,
      ),
    ).not.toThrow();
  });
});
