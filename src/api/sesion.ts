/* Puente entre el interceptor de axios y la capa de React.
   
   El interceptor detecta la sesión caída, pero no puede navegar: vive fuera
   del árbol de componentes y no tiene acceso al router. En vez de acoplarlo a
   una implementación concreta, avisa por aquí y quien sepa navegar se suscribe. */

type Escucha = () => void;

const escuchas = new Set<Escucha>();

/* Registra una reacción al vencimiento de la sesión. Devuelve la función para
   darse de baja, pensada para el cleanup de useEffect. */
export function alExpirarSesion(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

/* Por qué terminó la sesión, para decirlo en la pantalla de acceso.

   Antes la aplicación volvía al acceso sin ninguna explicación, aunque el
   servidor manda el motivo («expiró por inactividad», «ha sido cerrada»):
   quien se iba a atender a alguien y volvía encontraba el login y no sabía
   por qué había perdido lo que estaba escribiendo.

   Vive en sessionStorage y no en memoria para sobrevivir a la navegación dura
   de abajo; se borra al mostrarlo. Todo acceso va en try/catch: en modo
   privado o con el almacenamiento bloqueado puede lanzar, y entonces
   simplemente no hay aviso. */
const CLAVE_MOTIVO = "dmm:motivo-fin-sesion";

export const MOTIVO_GENERICO =
  "Su sesión terminó. Inicie sesión nuevamente para continuar.";

export function leerMotivoFinSesion(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE_MOTIVO);
  } catch {
    return null;
  }
}

export function olvidarMotivoFinSesion(): void {
  try {
    window.sessionStorage.removeItem(CLAVE_MOTIVO);
  } catch {
    /* nada que olvidar */
  }
}

/* Anuncia que el servidor rechazó la sesión, con el motivo que dio. Si nadie
   escucha todavía —por ejemplo si ocurre antes de montar la aplicación— se
   recurre a una navegación dura, para no dejar al usuario frente a una
   pantalla que ya no puede cargar ningún dato. */
export function anunciarSesionExpirada(motivo?: string): void {
  try {
    window.sessionStorage.setItem(CLAVE_MOTIVO, motivo || MOTIVO_GENERICO);
  } catch {
    /* sin almacenamiento: vuelve al acceso sin aviso, como antes */
  }

  if (escuchas.size === 0) {
    const { pathname, search } = window.location;
    if (pathname !== RUTA_ACCESO) {
      // Recuerda adónde se iba, como el acceso dentro de la aplicación
      // (rutas/acceso.ts, que no se importa aquí para no crear un ciclo)
      window.location.assign(
        pathname === "/"
          ? RUTA_ACCESO
          : RUTA_ACCESO +
              "?" +
              new URLSearchParams({ volver: pathname + search }).toString(),
      );
    }
    return;
  }
  for (const escucha of escuchas) escucha();
}

export const RUTA_ACCESO = "/acceso";
