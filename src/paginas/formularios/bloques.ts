import type { FormularioCampo } from "../../api/formularios";

/* El formulario se dibuja en el orden del papel: un título cada vez que
   cambia la sección, los campos sueltos seguidos en una misma rejilla, y cada
   grupo repetible (tabla de filas) en el lugar de su primer campo.

   Antes iban todos los sueltos primero y todos los grupos al final: en el
   estudio socioeconómico el grupo familiar quedaba después de la vivienda, y
   no se veía dónde terminaba la hoja 1 de la solicitud de silla. */

export type BloqueFormulario =
  | { tipo: "seccion"; titulo: string }
  | { tipo: "sueltos"; campos: FormularioCampo[] }
  | { tipo: "grupo"; nombre: string; campos: FormularioCampo[] };

export function bloquesDeFormulario(
  campos: FormularioCampo[],
): BloqueFormulario[] {
  const ordenados = [...campos].sort((a, b) => a.orden - b.orden);
  const bloques: BloqueFormulario[] = [];
  const grupos = new Map<string, Extract<BloqueFormulario, { tipo: "grupo" }>>();
  let seccionActual: string | null = null;

  for (const campo of ordenados) {
    if (campo.seccion && campo.seccion !== seccionActual) {
      bloques.push({ tipo: "seccion", titulo: campo.seccion });
      seccionActual = campo.seccion;
    }

    if (campo.grupo_repetible) {
      const existente = grupos.get(campo.grupo_repetible);
      if (existente) {
        existente.campos.push(campo);
      } else {
        const grupo = {
          tipo: "grupo" as const,
          nombre: campo.grupo_repetible,
          campos: [campo],
        };
        grupos.set(campo.grupo_repetible, grupo);
        bloques.push(grupo);
      }
      continue;
    }

    const ultimo = bloques[bloques.length - 1];
    if (ultimo?.tipo === "sueltos") ultimo.campos.push(campo);
    else bloques.push({ tipo: "sueltos", campos: [campo] });
  }

  return bloques;
}

/* Grupos cuyo papel lleva un total al pie. Se suman los campos en quetzales
   (los que dicen «(Q)» en la etiqueta). Mismo criterio que el expediente PDF
   (backend: lib/reportes/expediente.ts). */
export const TOTALES_DE_GRUPO: Record<string, string> = {
  ingresos: "Total de ingresos",
  egresos: "Total de egresos",
};

/** Suma de los campos «(Q)» de todas las filas. Lo vacío o ilegible no cuenta. */
export function totalDeGrupo(
  campos: FormularioCampo[],
  filas: Record<number, string | null>[],
): number {
  const enQuetzales = campos.filter((c) => c.etiqueta.includes("(Q)"));
  let total = 0;
  for (const fila of filas) {
    for (const campo of enQuetzales) {
      const numero = Number((fila[campo.id] ?? "").replace(/,/g, ""));
      if (Number.isFinite(numero)) total += numero;
    }
  }
  return total;
}

export function formatearQuetzales(monto: number): string {
  return (
    "Q " +
    monto.toLocaleString("es-GT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
