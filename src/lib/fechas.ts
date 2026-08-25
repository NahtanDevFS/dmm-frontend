/** Mayoría de edad en Guatemala. Decide si un beneficiario exige encargado. */
export const MAYORIA_DE_EDAD = 18;

/**
 * Convierte a fecha local sin que la zona horaria la desplace.
 *
 * El API devuelve las fechas como ISO en UTC («2015-05-10T00:00:00.000Z»), y
 * `new Date()` sobre eso da las 18:00 del día anterior en Guatemala (UTC-6).
 * Una fecha de nacimiento mal por un día no es cosmético: puede cambiar la
 * edad justo en el límite de los 18 años, que es lo que decide si el
 * beneficiario necesita encargado.
 *
 * Por eso se leen los tres primeros campos del texto y se construye la fecha
 * en la zona local, en vez de dejar que el navegador la interprete.
 */
function aFechaLocal(valor: string): Date {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (soloFecha) {
    const [, anio, mes, dia] = soloFecha;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }
  return new Date(valor);
}

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
  const nacimiento = aFechaLocal(fechaNacimiento);
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
  const fecha = aFechaLocal(valor);
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

/**
 * Hoy en aaaa-mm-dd, para el atributo `max` de un input date.
 *
 * Se compone a mano en vez de recortar un toISOString(): ese devuelve UTC, y
 * en Guatemala (UTC-6) a partir de las 18:00 daría el día siguiente. En un
 * campo que impide elegir fechas futuras eso significa permitir justo la que
 * la base va a rechazar, porque `recepcion_donacion_lote` tiene un CHECK de
 * fecha_recepcion <= CURRENT_DATE.
 */
export function fechaDeHoy(referencia = new Date()): string {
  const mes = String(referencia.getMonth() + 1).padStart(2, "0");
  const dia = String(referencia.getDate()).padStart(2, "0");
  return referencia.getFullYear() + "-" + mes + "-" + dia;
}

/** CUI/DPI agrupado como en el documento: 1234 56789 0101. */
export function formatearCui(cui: string | null | undefined): string {
  if (!cui) return "—";
  const limpio = cui.replace(/\s/g, "");
  if (limpio.length !== 13) return limpio;
  return limpio.slice(0, 4) + " " + limpio.slice(4, 9) + " " + limpio.slice(9);
}
