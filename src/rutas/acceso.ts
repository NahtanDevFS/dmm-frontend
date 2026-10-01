import { RUTA_ACCESO } from "../api/sesion";
import { tieneRol, type Rol } from "../types/api";
import { NAVEGACION, rutaInicialDe } from "./navegacion";

/* La dirección mientras se muestra la pantalla de acceso, y adónde se va al
   entrar.

   El acceso no es una pantalla del router: sin sesión, App lo muestra en
   lugar de todo lo demás. Antes la barra de direcciones seguía diciendo
   «/donaciones» frente al login, y al cerrar sesión a mano la siguiente
   persona entraba a la pantalla de la anterior: si su rol no la podía abrir,
   lo primero que veía era «Acceso denegado». */

const PARAMETRO = "volver";

/* «/acceso», con la pantalla a la que se iba cuando hay que regresar a ella:
   la sesión venció, o se abrió un enlace sin haber entrado. Tras un cierre
   manual no se guarda nada: quien entre después no tiene por qué caer donde
   estaba otra persona. */
export function direccionDeAcceso(
  pathname: string,
  search: string,
  conservar: boolean,
): string {
  if (!conservar || pathname === RUTA_ACCESO || pathname === "/") {
    return RUTA_ACCESO;
  }
  return (
    RUTA_ACCESO +
    "?" +
    new URLSearchParams({ [PARAMETRO]: pathname + search }).toString()
  );
}

/* Adónde llevar a quien acaba de entrar: la pantalla guardada, si su rol la
   puede abrir; si no, su inicio.

   Solo se aceptan rutas propias de la aplicación. `volver` llega en la
   dirección, y un enlace preparado podría traer «//otro-sitio» o una ruta
   que no existe. */
export function destinoTrasEntrar(rol: Rol | undefined, search: string): string {
  const inicio = rutaInicialDe(rol);
  const volver = new URLSearchParams(search).get(PARAMETRO);
  if (!volver || !volver.startsWith("/") || volver.startsWith("//")) {
    return inicio;
  }

  const ruta = volver.split(/[?#]/)[0];
  const pantalla = NAVEGACION.find((item) => item.ruta === ruta);
  if (!pantalla || !tieneRol(rol, pantalla.roles)) return inicio;

  return volver;
}
