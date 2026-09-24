/**
 * Marca de «el cierre de sesión no llegó a confirmarse».
 *
 * La cookie de sesión es HttpOnly y dura hasta 12 horas, incluso con el
 * navegador cerrado. Si el POST /auth/logout falla por red o por el servidor,
 * la sesión sigue viva: sin esta marca, recargar la página la recuperaría en
 * silencio con GET /auth/me y la siguiente persona que use la computadora
 * entraría como la anterior.
 *
 * Vive en localStorage (no en memoria ni en sessionStorage) justamente para
 * sobrevivir a la recarga y al cierre de la pestaña. Todo acceso va en
 * try/catch: en modo privado o con el almacenamiento bloqueado puede lanzar, y
 * entonces se degrada a la marca en memoria que mantiene el proveedor.
 */

const CLAVE = "dmm:cierre-sesion-pendiente";

export function hayCierrePendiente(): boolean {
  try {
    return window.localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}

export function marcarCierrePendiente(): void {
  try {
    window.localStorage.setItem(CLAVE, "1");
  } catch {
    /* sin almacenamiento: queda solo la marca en memoria */
  }
}

export function limpiarCierrePendiente(): void {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    /* nada que limpiar */
  }
}
