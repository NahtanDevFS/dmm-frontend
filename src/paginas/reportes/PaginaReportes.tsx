import { useState } from "react";
import SeccionPersonasAtendidas from "./SeccionPersonasAtendidas";
import SeccionStockPorCategoria from "./SeccionStockPorCategoria";
import SeccionPoblacionBeneficiada from "./SeccionPoblacionBeneficiada";
import estilos from "./Reportes.module.css";

const VISTAS = [
  { id: "personas", etiqueta: "Personas atendidas" },
  { id: "stock", etiqueta: "Stock por categoría" },
  { id: "poblacion", etiqueta: "Población beneficiada" },
] as const;

type Vista = (typeof VISTAS)[number]["id"];

/**
 * Único módulo con acceso de ALCALDE (solo lectura); DIRECTORA también
 * entra. Cada reporte se genera en pantalla y se puede exportar a Excel o
 * PDF — el archivo lo arma el backend, aquí solo se pide y se descarga.
 */
function PaginaReportes() {
  const [vista, setVista] = useState<Vista>("personas");

  return (
    <>
      <header className={estilos.encabezado}>
        <h1>Reportes</h1>
        <p className={estilos.nota}>
          Genere el reporte en pantalla, y expórtelo a Excel o PDF si lo
          necesita para compartir o imprimir.
        </p>
      </header>

      <div
        className={estilos.selector}
        role="group"
        aria-label="Elegir reporte"
      >
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={
              estilos.pildora +
              (vista === v.id ? " " + estilos.pildoraActiva : "")
            }
            aria-pressed={vista === v.id}
            onClick={() => setVista(v.id)}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>

      {vista === "personas" && <SeccionPersonasAtendidas />}
      {vista === "stock" && <SeccionStockPorCategoria />}
      {vista === "poblacion" && <SeccionPoblacionBeneficiada />}
    </>
  );
}

export default PaginaReportes;
