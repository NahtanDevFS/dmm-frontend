/**
 * Puente entre el interceptor de axios y la capa de React.
 *
 * El interceptor detecta la sesión caída, pero no puede navegar: vive fuera
 * del árbol de componentes y no tiene acceso al router. En vez de acoplarlo a
 * una implementación concreta, avisa por aquí y quien sepa navegar se suscribe.
 */

type Escucha = () => void;

const escuchas = new Set<Escucha>();

/**
 * Registra una reacción al vencimiento de la sesión. Devuelve la función para
 * darse de baja, pensada para el cleanup de useEffect.
 */
export function alExpirarSesion(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

/**
 * Anuncia que el servidor rechazó la sesión. Si nadie escucha todavía —por
 * ejemplo si ocurre antes de montar la aplicación— se recurre a una navegación
 * dura, para no dejar al usuario frente a una pantalla que ya no puede cargar
 * ningún dato.
 */
export function anunciarSesionExpirada(): void {
  if (escuchas.size === 0) {
    if (window.location.pathname !== RUTA_ACCESO) {
      window.location.assign(RUTA_ACCESO);
    }
    return;
  }
  for (const escucha of escuchas) escucha();
}

export const RUTA_ACCESO = "/acceso";
