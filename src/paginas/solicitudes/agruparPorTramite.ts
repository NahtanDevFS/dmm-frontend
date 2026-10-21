/* Agrupación visual del listado de solicitudes.

   El listado tiene una fila por insumo (cada uno avanza según su propio stock),
   así que un trámite con varios insumos ocupa varias filas seguidas. Para cada
   fila se calcula si continúa el trámite de la anterior, cuántas filas abarca
   el trámite (para unir sus celdas comunes con rowSpan) y a qué tramo de color
   pertenece: el fondo alterna por trámite, no por fila. */

export interface PosicionEnTramite {
  // true si la fila es del mismo trámite que la de arriba.
  continua: boolean;
  // Filas que ocupa el trámite. Solo importa en la primera (la que no continúa).
  filas: number;
  // Tramo de color: los trámites se alternan, todas sus filas comparten tramo.
  par: boolean;
}

export function agruparPorTramite(
  filas: readonly { solicitud_id: number }[],
): PosicionEnTramite[] {
  const posiciones: PosicionEnTramite[] = [];
  let tramo = -1;
  let inicio = 0;
  filas.forEach((fila, i) => {
    const continua = i > 0 && filas[i - 1].solicitud_id === fila.solicitud_id;
    if (!continua) {
      tramo++;
      inicio = i;
    }
    posiciones.push({ continua, filas: 1, par: tramo % 2 === 1 });
    posiciones[inicio].filas = i - inicio + 1;
  });
  return posiciones;
}
