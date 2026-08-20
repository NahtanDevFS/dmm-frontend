/** Mayoría de edad en Guatemala. Decide si un beneficiario exige encargado. */
export const MAYORIA_DE_EDAD = 18;

/**
 * Edad cumplida a día de hoy.
 *
 * Se calcula restando años y descontando uno si aún no ha llegado el
 * cumpleaños, en vez de dividir milisegundos por 365.25: esa aproximación
 * falla en los bisiestos y en la propia fecha del cumpleaños, que es justo el
 * día en que un menor deja de necesitar encargado.
 *
 * Ojo: los reportes usan la edad que la persona tenía **a la fecha de la
 * entrega**, no esta. Son cosas distintas.
 */
export function calcularEdad(fechaNacimiento: string, referencia = new Date()): number {
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return Number.NaN;

  let edad = referencia.getFullYear() - nacimiento.getFullYear();
  const mes = referencia.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && referencia.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad;
}

export function esMenorDeEdad(fechaNacimiento: string): boolean {
  const edad = calcularEdad(fechaNacimiento);
  return Number.isFinite(edad) && edad < MAYORIA_DE_EDAD;
}

/** Fecha legible en formato guatemalteco: 03/04/2026. */
export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Fecha para un input date, que exige exactamente aaaa-mm-dd.
 * El API devuelve ISO completo, así que basta con recortar.
 */
export function aFechaDeInput(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor.slice(0, 10);
}

/** CUI/DPI agrupado como en el documento: 1234 56789 0101. */
export function formatearCui(cui: string | null | undefined): string {
  if (!cui) return "—";
  const limpio = cui.replace(/\s/g, "");
  if (limpio.length !== 13) return limpio;
  return limpio.slice(0, 4) + " " + limpio.slice(4, 9) + " " + limpio.slice(9);
}
