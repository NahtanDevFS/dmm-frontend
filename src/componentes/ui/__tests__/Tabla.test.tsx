import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
  CeldaIdentificador,
  FilaInactiva,
} from "../Tabla";

describe("Tabla", () => {
  it("pone el título como caption, para que un lector de pantalla lo anuncie", () => {
    render(
      <Tabla titulo="Listado de beneficiarios">
        <tbody>
          <tr>
            <td>Fila</td>
          </tr>
        </tbody>
      </Tabla>,
    );
    // El caption es accesible por rol de tabla, no queda oculto del todo.
    const tabla = screen.getByRole("table");
    expect(tabla).toHaveAccessibleName("Listado de beneficiarios");
  });

  it("renderiza los hijos dentro del elemento table", () => {
    render(
      <Tabla titulo="x">
        <tbody>
          <tr>
            <td>Contenido de prueba</td>
          </tr>
        </tbody>
      </Tabla>,
    );
    expect(screen.getByText("Contenido de prueba")).toBeInTheDocument();
  });

  it("combina la clase propia con una className adicional", () => {
    const { container } = render(
      <Tabla titulo="x" className="extra">
        <tbody />
      </Tabla>,
    );
    const envoltura = container.firstElementChild;
    expect(envoltura?.className).toContain("extra");
  });

  it("no rompe si no se pasa className", () => {
    expect(() =>
      render(
        <Tabla titulo="x">
          <tbody />
        </Tabla>,
      ),
    ).not.toThrow();
  });
});

describe("CeldaIdentificador / CeldaCantidad / CeldaAcciones", () => {
  it("renderizan como celdas td normales con su contenido", () => {
    render(
      <table>
        <tbody>
          <tr>
            <CeldaIdentificador>1234 56789 0101</CeldaIdentificador>
            <CeldaCantidad>42</CeldaCantidad>
            <CeldaAcciones>
              <button>Editar</button>
            </CeldaAcciones>
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByText("1234 56789 0101")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("pasan atributos adicionales al td (p.ej. colSpan)", () => {
    render(
      <table>
        <tbody>
          <tr>
            <CeldaCantidad colSpan={2}>x</CeldaCantidad>
          </tr>
        </tbody>
      </table>,
    );
    const celda = screen.getByText("x");
    expect(celda.tagName).toBe("TD");
    expect(celda).toHaveAttribute("colspan", "2");
  });
});

describe("FilaInactiva", () => {
  it("renderiza como una fila tr con sus celdas hijas", () => {
    render(
      <table>
        <tbody>
          <FilaInactiva>
            <td>Beneficiario dado de baja</td>
          </FilaInactiva>
        </tbody>
      </table>,
    );
    const fila = screen.getByText("Beneficiario dado de baja").closest("tr");
    expect(fila).toBeInTheDocument();
  });
});
