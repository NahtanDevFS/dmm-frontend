/**
 * SELECCION_MULTIPLE se guarda como JSON (`["Agua","Luz"]`) dentro del único
 * valor_texto que la base ofrece por respuesta: una coma simple se rompería
 * si alguna etiqueta de opción llegara a tener una coma propia.
 */
export function valoresSeleccionMultiple(valorTexto: string | null): string[] {
  if (!valorTexto) return [];
  try {
    const parsed: unknown = JSON.parse(valorTexto);
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
