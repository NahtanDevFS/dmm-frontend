/**
 * Cuántas unidades base entran realmente al inventario.
 *
 * Es la misma fórmula que aplica trg_calcular_recepcion_lote:
 * FLOOR(cantidad × unidades_por_presentación). Se replica aquí **solo para
 * mostrarla**; el valor que manda es el que calcula la base, y por eso el
 * formulario no envía cantidad_inicial ni cantidad_disponible.
 *
 * El truncamiento es lo que hay que enseñar antes de guardar. Media caja de
 * cien entra entera —2.5 × 100 son 250—, pero media caja de tres se pierde:
 * 2.5 × 3 entra como 7, no como 7.5. Esa unidad de menos no vuelve a aparecer
 * en ningún informe posterior, así que el sitio para verla es este.
 */
export function calcularUnidadesBase(
  cantidad: number,
  unidadesPorPresentacion: number,
): number {
  if (!Number.isFinite(cantidad) || !Number.isFinite(unidadesPorPresentacion)) {
    return Number.NaN;
  }
  return Math.floor(cantidad * unidadesPorPresentacion);
}
