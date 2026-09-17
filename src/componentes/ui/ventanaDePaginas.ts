/**
 * Ventana de páginas alrededor de la actual.
 *
 * Con 240 registros y 50 por página son cinco botones y caben todos, pero la
 * auditoría crece sin techo y ahí serían cientos. La ventana mantiene la
 * paginación en una sola línea sea cual sea el volumen.
 *
 * Vive en su propio archivo, separada del componente Paginacion, porque
 * react-refresh exige que un archivo de componente solo exporte
 * componentes: exportar aquí también esta función rompía el fast refresh
 * en desarrollo.
 */
export function ventanaDePaginas(
  actual: number,
  total: number,
): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const paginas = new Set<number>([1, total, actual]);
  if (actual - 1 > 1) paginas.add(actual - 1);
  if (actual + 1 < total) paginas.add(actual + 1);

  const ordenadas = [...paginas].sort((a, b) => a - b);
  const resultado: (number | "…")[] = [];
  let previa = 0;
  for (const pagina of ordenadas) {
    if (previa && pagina - previa > 1) resultado.push("…");
    resultado.push(pagina);
    previa = pagina;
  }
  return resultado;
}
