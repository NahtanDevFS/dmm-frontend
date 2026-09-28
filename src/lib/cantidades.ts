/**
 * Cantidad con su unidad de medida: "20 × Tableta".
 *
 * La unidad viene del catálogo en singular y no se pluraliza: nombres como
 * "Caja de 100" o "Blíster" no tienen un plural automático fiable, y un
 * plural mal formado se lee peor que el signo ×.
 */
export function formatearCantidad(cantidad: number, unidad: string): string {
  return cantidad.toLocaleString("es-GT") + " × " + unidad;
}
