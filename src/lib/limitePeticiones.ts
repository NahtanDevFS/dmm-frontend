import axios from "axios";

/**
 * Lectura del límite de peticiones que anuncia el servidor.
 *
 * El backend configura express-rate-limit con `standardHeaders: "draft-8"` y
 * expone `RateLimit` por CORS, así que el navegador puede leerla.
 *
 * La respuesta del login trae **dos** políticas, porque la petición atraviesa
 * dos limitadores encadenados:
 *
 *     RateLimit: "300-in-1min"; r=299; t=60      ← límite general de /api
 *     RateLimit: "10-in-15min"; r=9;   t=900     ← límite de login
 *
 * El navegador une las cabeceras repetidas en una sola cadena separada por
 * comas, de modo que quedarse con la primera coincidencia daría 299: el
 * presupuesto general, no los intentos de acceso. Por eso se leen todas y se
 * devuelve la **más restrictiva**, que es la que de verdad va a bloquear al
 * usuario. Tomar el mínimo, en lugar de buscar la política por nombre, sigue
 * siendo correcto si mañana cambian los cupos o se añade otro limitador.
 *
 * La alternativa —contar los fallos en el cliente— se descartó por mentirosa:
 * el límite se lleva en el servidor por IP y usuario, así que una recarga, otra
 * pestaña o cambiar de nombre de usuario darían una cuenta distinta a la real.
 */
export function intentosRestantes(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;

  const cabecera = error.response?.headers?.["ratelimit"];
  const texto =
    typeof cabecera === "string"
      ? cabecera
      : Array.isArray(cabecera)
        ? cabecera.join(", ")
        : null;
  if (texto === null) return null;

  // draft-8: `"login"; r=7; t=42`   ·   draft-7: `limit=10, remaining=7, reset=42`
  const restantes = [...texto.matchAll(/(?:^|[;,\s])r(?:emaining)?=(\d+)/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));

  return restantes.length > 0 ? Math.min(...restantes) : null;
}
