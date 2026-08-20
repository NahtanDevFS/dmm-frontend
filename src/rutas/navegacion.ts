import {
  DIRECCION,
  OPERACION,
  REPORTES,
  ROL,
  SOLO_ADMIN,
  tieneRol,
  type Rol,
} from "../types/api";

export interface ItemNavegacion {
  etiqueta: string;
  ruta: string;
  /** Roles que ven el ítem. Espejo del requireRole de la ruta del backend. */
  roles: readonly Rol[];
}

/**
 * Modelo único de la navegación: lo consumen el menú lateral, el árbol de
 * rutas y la guarda por rol. Tenerlo en un solo sitio evita que un módulo
 * aparezca en el menú pero su ruta quede sin proteger, o al revés.
 *
 * Los conjuntos de roles vienen de types/api.ts, que a su vez replica
 * dmm-backend/src/config/roles.ts. La autoridad sigue siendo el backend: esto
 * solo evita ofrecer lo que el servidor va a rechazar con un 403.
 */
export const NAVEGACION: readonly ItemNavegacion[] = [
  { etiqueta: "Inicio", ruta: "/", roles: OPERACION },
  { etiqueta: "Beneficiarios", ruta: "/beneficiarios", roles: OPERACION },
  { etiqueta: "Solicitudes", ruta: "/solicitudes", roles: OPERACION },
  { etiqueta: "Donaciones", ruta: "/donaciones", roles: OPERACION },
  { etiqueta: "Entregas", ruta: "/entregas", roles: OPERACION },
  { etiqueta: "Inventario", ruta: "/inventario", roles: OPERACION },
  { etiqueta: "Préstamos", ruta: "/prestamos", roles: OPERACION },
  { etiqueta: "Catálogos", ruta: "/catalogos", roles: DIRECCION },
  { etiqueta: "Reportes", ruta: "/reportes", roles: REPORTES },
  { etiqueta: "Usuarios", ruta: "/usuarios", roles: SOLO_ADMIN },
  { etiqueta: "Auditoría", ruta: "/auditoria", roles: SOLO_ADMIN },
];

/** Ítems visibles para un rol. El menú no muestra lo que no se puede abrir. */
export function navegacionDe(rol: Rol | undefined): ItemNavegacion[] {
  return NAVEGACION.filter((item) => tieneRol(rol, item.roles));
}

/**
 * Dónde aterriza cada rol al entrar.
 *
 * ALCALDE no pasa por Inicio: su acceso es exclusivamente de lectura sobre
 * Reportes, así que se le lleva directo a su único módulo en lugar de
 * mostrarle un panel vacío o una pantalla de acceso denegado.
 */
export function rutaInicialDe(rol: Rol | undefined): string {
  if (rol === ROL.ALCALDE) return "/reportes";
  return "/";
}
