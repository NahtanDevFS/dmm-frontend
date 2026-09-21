/**
 * Cálculo de unidades base que entran al inventario (solo para visualización)
 * El valor real lo calcula la base de datos (trg_calcular_recepcion_lote)
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
