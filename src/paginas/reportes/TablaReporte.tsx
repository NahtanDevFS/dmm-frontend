import Tabla, { CeldaCantidad } from "../../componentes/ui/Tabla";
import { formatearFecha } from "../../lib/fechas";
import type { ColumnaReporte } from "../../api/reportes";
import estilos from "./Reportes.module.css";

/** true si el nombre de campo sugiere una fecha (fecha_x, x_fecha, generado_en). */
function pareceFecha(campo: string): boolean {
  return /fecha|_en$/i.test(campo);
}

/** true si el valor es puramente numérico, para alinearlo como cantidad. */
function esNumerico(valor: unknown): valor is number {
  return typeof valor === "number";
}

function formatearValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "string" && pareceFecha(campo)) {
    // Los meses del reporte de población vienen como "2026-03", no una
    // fecha completa: formatearFecha con eso da "Fecha inválida", así que
    // solo se formatea si de verdad parsea.
    const formateada = formatearFecha(valor);
    return formateada === "—" ? valor : formateada;
  }
  if (esNumerico(valor)) return valor.toLocaleString("es-GT");
  return String(valor);
}

/**
 * Tabla genérica para cualquier reporte: recorre columnas y datos tal como
 * los define el backend, sin columnas fijas de antemano — cada uno de los
 * tres reportes trae su propia forma, y el backend es la fuente de verdad
 * de qué campos mostrar y en qué orden.
 */
function TablaReporte({
  titulo,
  columnas,
  datos,
}: {
  titulo: string;
  columnas: ColumnaReporte[];
  datos: Record<string, unknown>[];
}) {
  return (
    <Tabla titulo={titulo}>
      <thead>
        <tr>
          {columnas.map((columna) => (
            <th key={columna.campo}>{columna.titulo}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {datos.map((fila, indice) => (
          <tr key={indice}>
            {columnas.map((columna) => {
              const valor = fila[columna.campo];
              const texto = formatearValor(columna.campo, valor);
              return esNumerico(valor) ? (
                <CeldaCantidad key={columna.campo}>{texto}</CeldaCantidad>
              ) : (
                <td
                  key={columna.campo}
                  className={texto === "—" ? estilos.celdaVacia : undefined}
                >
                  {texto}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Tabla>
  );
}

export default TablaReporte;
