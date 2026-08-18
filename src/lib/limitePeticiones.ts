import axios from "axios";

/**
 * Lectura del límite de peticiones que anuncia el servidor.
 *
 * El backend configura express-rate-limit con `standardHeaders: "draft-8"`, así
 * que cada respuesta del login trae una cabecera `RateLimit` con los intentos
 * que quedan antes del bloqueo temporal (10 fallidos por IP y usuario cada
 * 15 minutos; un acierto no gasta cuota).
 *
 * Hoy esto devuelve `null` en el navegador: la cabecera se envía, pero la
 * configuración de CORS del backend no la declara en `exposedHeaders`, y una
 * cabecera fuera de esa lista blanca es invisible para JavaScript entre
 * orígenes. Queda implementado para que funcione en cuanto se exponga, sin
 * tocar la pantalla de acceso.
 *
 * La alternativa —contar los fallos en el cliente— se descartó por mentirosa:
 * el límite se lleva en el servidor por IP y usuario, así que una recarga, otra
 * pestaña o cambiar de nombre de usuario darían una cuenta distinta a la real.
 */
export function intentosRestantes(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;

  const cabecera = error.response?.headers?.["ratelimit"];
  if (typeof cabecera !== "string") return null;

  // draft-8: `"login";r=7;t=42`   ·   draft-7: `limit=10, remaining=7, reset=42`
  const coincidencia = cabecera.match(/(?:^|[;,\s])r(?:emaining)?=(\d+)/i);
  if (!coincidencia) return null;

  const restantes = Number(coincidencia[1]);
  return Number.isFinite(restantes) ? restantes : null;
}
