import axios from "axios";

/**
 * Traducción de errores del API a mensajes para el usuario.
 *
 * Premisa: el backend ya hace la mitad del trabajo. Su errorHandler traduce las
 * excepciones de Postgres —triggers, checks y constraints, donde vive buena
 * parte de la lógica de negocio— a mensajes en español ya redactados
 * («Ya existe un insumo con ese nombre en la categoría»). Ese mensaje es
 * siempre más útil que cualquier texto genérico que se pueda escribir aquí,
 * porque conoce el caso concreto.
 *
 * Por eso el orden es: primero el mensaje del servidor, y solo si no viene se
 * recurre al mapa por código.
 */

/** Detalle por campo que agregan las respuestas de validación (Zod). */
export type ErroresPorCampo = Record<string, string[]>;

interface CuerpoDeError {
  message?: string;
  errores?: ErroresPorCampo;
}

/** Respaldos por código. Solo se usan cuando el servidor no mandó mensaje. */
const MENSAJES_POR_CODIGO: Record<number, string> = {
  400: "Los datos enviados no son válidos. Revise el formulario.",
  401: "Su sesión no es válida. Vuelva a iniciar sesión.",
  403: "Su usuario no tiene permiso para realizar esta acción.",
  404: "No se encontró el registro solicitado.",
  409: "La operación entra en conflicto con el estado actual del registro.",
  429: "Demasiadas peticiones. Espere un momento e intente de nuevo.",
  500: "Ocurrió un error en el servidor. Intente de nuevo en unos minutos.",
};

const SIN_RESPUESTA =
  "No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.";

const DESCONOCIDO = "Ocurrió un error inesperado.";

/** Código HTTP del error, o `undefined` si la petición nunca llegó a responder. */
export function estadoDe(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

function cuerpoDe(error: unknown): CuerpoDeError | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const datos = error.response?.data;
  return typeof datos === "object" && datos !== null
    ? (datos as CuerpoDeError)
    : undefined;
}

/**
 * Mensaje listo para mostrar. `respaldo` permite que la pantalla aporte
 * contexto propio cuando ni el servidor ni el código dicen algo útil.
 */
export function mensajeDeError(error: unknown, respaldo?: string): string {
  if (axios.isAxiosError(error)) {
    const delServidor = cuerpoDe(error)?.message;
    if (delServidor) return delServidor;

    const estado = error.response?.status;
    if (estado === undefined) return respaldo ?? SIN_RESPUESTA;
    if (estado in MENSAJES_POR_CODIGO) return MENSAJES_POR_CODIGO[estado];
    if (estado >= 500) return MENSAJES_POR_CODIGO[500];
  }

  if (error instanceof Error && error.message) return respaldo ?? error.message;
  return respaldo ?? DESCONOCIDO;
}

/**
 * Detalle por campo de una respuesta de validación, para pintarlo bajo cada
 * input. El manual exige mensaje explícito bajo el campo, nunca solo un borde
 * de color (sección 7).
 */
export function erroresPorCampo(error: unknown): ErroresPorCampo | null {
  const errores = cuerpoDe(error)?.errores;
  if (!errores || typeof errores !== "object") return null;
  return Object.keys(errores).length > 0 ? errores : null;
}

/** Primer mensaje de un campo concreto, que es lo que se pinta bajo el input. */
export function errorDeCampo(error: unknown, campo: string): string | undefined {
  return erroresPorCampo(error)?.[campo]?.[0];
}

/**
 * Conflicto con el estado actual: duplicado, sin stock, ya entregado, ya
 * cancelado. Merece un tratamiento distinto al de un error de validación,
 * porque el formulario está bien y lo que cambió es el mundo.
 */
export function esConflicto(error: unknown): boolean {
  return estadoDe(error) === 409;
}

/** Sin permiso para la acción. El rol se decide en el backend, no aquí. */
export function esSinPermiso(error: unknown): boolean {
  return estadoDe(error) === 403;
}

/** Límite de peticiones excedido: 300 por minuto por IP, o 10 logins fallidos. */
export function esLimiteExcedido(error: unknown): boolean {
  return estadoDe(error) === 429;
}

/** La petición no llegó a obtener respuesta: red caída o backend apagado. */
export function esFalloDeRed(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response === undefined;
}
