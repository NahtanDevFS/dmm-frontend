import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TablaReporte from "../TablaReporte";

/* Las columnas de catálogo de un reporte llegan como identificador
   (FEMENINO, ADULTO_MAYOR) y se mostraban así. Se traducen solo esas: los
   demás textos (nombres, comunidades) se dejan tal cual. */
describe("TablaReporte", () => {
  it("muestra legibles las columnas de catálogo y deja igual el resto", () => {
    render(
      <TablaReporte
        titulo="Personas atendidas"
        columnas={[
          { campo: "persona_nombre_completo", titulo: "Beneficiario", ancho: 20 },
          { campo: "genero", titulo: "Género", ancho: 10 },
          { campo: "grupo_etario", titulo: "Grupo", ancho: 10 },
          { campo: "comunidad_nombre", titulo: "Comunidad", ancho: 10 },
        ]}
        datos={[
          {
            persona_nombre_completo: "María Elena Pérez",
            genero: "FEMENINO",
            grupo_etario: "ADULTO_MAYOR",
            comunidad_nombre: "SANTA_CRUZ",
          },
        ]}
      />,
    );

    expect(screen.getByRole("cell", { name: "Femenino" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Adulto mayor" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "María Elena Pérez" })).toBeInTheDocument();
    // No es columna de catálogo: aunque parezca identificador, no se toca
    expect(screen.getByRole("cell", { name: "SANTA_CRUZ" })).toBeInTheDocument();
  });
});
