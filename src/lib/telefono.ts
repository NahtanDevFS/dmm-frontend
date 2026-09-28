/**
 * Teléfono guatemalteco: ocho dígitos.
 *
 * Se aceptan espacios, guiones y el prefijo +502 al escribir —así se dictan y
 * así los copian de una libreta— pero se guardan normalizados a los ocho
 * dígitos solos, para que buscar un número no dependa de cómo lo escribió
 * quien lo registró.
 *
 * No se valida el primer dígito (3/4/5 móvil, 2/6/7 fijo): la asignación de
 * rangos cambia con el tiempo y rechazar un número real que ya está en una
 * ficha de papel es peor que aceptar uno improbable.
 *
 * Espejo de lib/telefono.ts en el backend, que es quien manda.
 */
export function normalizarTelefono(valor: string): string {
  return valor
    .trim()
    .replace(/[\s()-]/g, "")
    .replace(/^\+?502/, "");
}

export function telefonoValido(valor: string): boolean {
  return /^\d{8}$/.test(normalizarTelefono(valor));
}

/**
 * Lo más largo que se escribe en la práctica: "+502 5512-3344". El límite
 * corta a tiempo lo que no puede terminar siendo un teléfono, en vez de
 * dejarlo escribir entero para rechazarlo al guardar.
 */
export const LARGO_MAXIMO_TELEFONO = 14;

/** Descarta al teclear lo que no pertenece a un teléfono (letras, puntos…). */
export function filtrarEntradaTelefono(valor: string): string {
  return valor.replace(/[^\d\s()+-]/g, "").slice(0, LARGO_MAXIMO_TELEFONO);
}
