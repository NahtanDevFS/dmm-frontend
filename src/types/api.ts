/**
 * Tipos del API — Sistema DMM Usumatlán.
 *
 * Aquí viven solo las formas transversales: el sobre de paginación, la sesión,
 * los roles y las entidades que consume más de un módulo. Las entidades propias
 * de un módulo (solicitud, entrega, contrato…) llegan con el PR de ese módulo,
 * junto a su cliente, para no acumular un archivo que nadie sabe si sigue
 * cuadrando con el backend.
 */

/* ═══════════════════════════ Paginación ═══════════════════════════ */

/**
 * Sobre uniforme de los listados de negocio.
 * Espejo de RespuestaPaginada<T> en dmm-backend/src/lib/paginacion.ts.
 *
 * Lo devuelven: personas, insumos, recepciones, solicitudes, entregas,
 * contratos, usuarios y auditoría. Los catálogos de selección NO: entregan el
 * arreglo completo porque su consumidor es un <select>.
 */
export interface Sobre<T> {
  total: number;
  limite: number;
  desplazamiento: number;
  /** Lo calcula el servidor para que el cliente no repita la aritmética. */
  hay_mas: boolean;
  datos: T[];
}

export const LIMITE_MAXIMO = 200;
export const LIMITE_POR_DEFECTO = 50;

/* ═══════════════════════════ Errores ═══════════════════════════ */

export interface RespuestaError {
  message: string;
  /** Solo en respuestas de validación: detalle por campo. */
  errores?: Record<string, string[]>;
}

/* ═══════════════════════════ Roles y sesión ═══════════════════════════ */

export const ROL = {
  EMPLEADO_DMM: "EMPLEADO_DMM",
  DIRECTORA: "DIRECTORA",
  ALCALDE: "ALCALDE",
  ADMINISTRADOR: "ADMINISTRADOR",
} as const;

export type Rol = (typeof ROL)[keyof typeof ROL];

/**
 * Conjuntos de autorización, espejo de dmm-backend/src/config/roles.ts.
 *
 * El backend es la autoridad: los permisos están codificados en cada ruta con
 * requireRole y no son administrables desde ninguna pantalla. Esta copia sirve
 * únicamente para no ofrecer en la interfaz lo que el servidor va a rechazar
 * con un 403. Si ambos se separan, manda el backend.
 *
 * Se nombran por intención —qué permiten— y no por quién los compone, para que
 * agregar o quitar un rol sea una decisión consciente en un solo lugar.
 */

/** Cualquier usuario autenticado. La propia sesión y la propia contraseña. */
export const TODOS: readonly Rol[] = [
  ROL.EMPLEADO_DMM,
  ROL.DIRECTORA,
  ROL.ALCALDE,
  ROL.ADMINISTRADOR,
];

/**
 * Operación diaria: beneficiarios, inventario, solicitudes, entregas y
 * préstamos. Excluye a ALCALDE por decisión de negocio: su acceso es
 * exclusivamente el módulo de reportes.
 */
export const OPERACION: readonly Rol[] = [
  ROL.EMPLEADO_DMM,
  ROL.DIRECTORA,
  ROL.ADMINISTRADOR,
];

/**
 * Decisiones que quedan con dirección: catálogos, aprobación y rechazo de
 * solicitudes, anulación de entregas, multas y marcado de contratos vencidos.
 */
export const DIRECCION: readonly Rol[] = [ROL.DIRECTORA, ROL.ADMINISTRADOR];

/** Único módulo donde entra ALCALDE, y sin ningún endpoint de escritura. */
export const REPORTES: readonly Rol[] = [
  ROL.DIRECTORA,
  ROL.ALCALDE,
  ROL.ADMINISTRADOR,
];

/**
 * Administración del sistema: gestión de usuarios, catálogo de roles y
 * consulta de la bitácora de auditoría.
 *
 * Incluye a DIRECTORA por decisión de la DMM: en una dirección municipal
 * pequeña no hay un área de sistemas aparte, y es la directora quien da de
 * alta al personal y responde por lo que queda registrado. Espejo de
 * ADMINISTRACION en dmm-backend/src/config/roles.ts, que se llamaba
 * SOLO_ADMIN mientras el conjunto tuvo un solo rol.
 *
 * En la práctica deja los dos roles equivalentes en poder, porque quien
 * gestiona usuarios puede crear otra cuenta de administrador.
 */
export const ADMINISTRACION: readonly Rol[] = [
  ROL.DIRECTORA,
  ROL.ADMINISTRADOR,
];

/**
 * Resolución de solicitudes de apoyo: aprobar y rechazar.
 *
 * Es el único conjunto que se aparta a propósito del backend. El servidor
 * admite DIRECTORA y ADMINISTRADOR en POST /solicitudes/:id/aprobar, pero la
 * dirección de la DMM decidió que el dictamen es competencia exclusiva de la
 * directora: administración existe para sostener el sistema, no para resolver
 * expedientes de personas.
 *
 * La interfaz por tanto solo se lo ofrece a DIRECTORA. Un ADMINISTRADOR que
 * llamara al endpoint a mano seguiría siendo aceptado por el servidor; cerrar
 * también esa puerta exige un cambio de backend.
 */
export const RESOLUCION_SOLICITUD: readonly Rol[] = [ROL.DIRECTORA];

export function tieneRol(
  rol: Rol | string | undefined,
  permitidos: readonly Rol[],
): boolean {
  return rol !== undefined && (permitidos as readonly string[]).includes(rol);
}

/** Lo que devuelven POST /auth/login y GET /auth/me. */
export interface UsuarioSesion {
  id: number;
  username: string;
  rol: Rol;
}

export interface RespuestaSesion {
  usuario: UsuarioSesion;
}

/* ═══════════════════════════ Catálogos ═══════════════════════════ */

/**
 * Forma común de los catálogos con CRUD genérico: discapacidades, programas,
 * categorías de insumo, marcas de insumo, unidades de medida e instituciones
 * donantes.
 */
export interface ElementoCatalogo {
  id: number;
  nombre: string;
  activo: boolean;
}

/** Único catálogo con descripción. */
export interface Programa extends ElementoCatalogo {
  descripcion: string | null;
}

/** Único catálogo con datos de contacto. */
export interface InstitucionDonante extends ElementoCatalogo {
  telefono: string | null;
  correo: string | null;
}

export type Departamento = ElementoCatalogo;

export interface Municipio extends ElementoCatalogo {
  departamento_id: number;
}

/** Módulo aparte del CRUD genérico: su unicidad es por (nombre, municipio_id). */
export interface Comunidad extends ElementoCatalogo {
  municipio_id: number;
  ubicacion: string | null;
}

/* ═══════════════════════════ Beneficiarios ═══════════════════════════ */

/**
 * Persona tal como la devuelve el listado. Espejo de SELECT_PUBLICO en
 * dmm-backend/src/modules/personas/persona.repository.ts: el repositorio
 * selecciona columnas explícitas, así que la ficha no expone más que esto.
 */
export interface Persona {
  id: number;
  cui_dpi: string | null;
  nombres: string;
  apellidos: string;
  /** ISO 8601. Un menor sin DPI exige encargado, y lo valida la base. */
  fecha_nacimiento: string;
  genero_id: number | null;
  comunidad_id: number | null;
  telefono: string | null;
  /**
   * Los datos que pide la sección I del estudio socioeconómico. Se guardan
   * en la ficha y NO se vuelven a preguntar dentro de cada formulario: dos
   * copias del mismo dato pueden discrepar, y la del formulario no sirve
   * para buscar ni para reportes.
   */
  direccion: string | null;
  estado_civil_id: number | null;
  grado_academico_id: number | null;
  ocupacion_id: number | null;
  /**
   * Municipio donde nació, que cuelga de su departamento. Distinto de la
   * comunidad, que es dónde vive hoy: se puede nacer en un sitio y residir en
   * otro, y el estudio socioeconómico distingue las dos cosas.
   */
  municipio_nacimiento_id: number | null;
  activo: boolean;
}

/* ═══════════════════════════ Inventario ═══════════════════════════ */

/**
 * Semáforo de caducidad. GRIS es «sin fecha de caducidad», no un estado
 * intermedio: los insumos que no caducan nunca entran en la escala de colores.
 */
export const SEMAFORO = {
  VENCIDO: "VENCIDO",
  ROJO: "ROJO",
  AMARILLO: "AMARILLO",
  VERDE: "VERDE",
  GRIS: "GRIS",
} as const;

export type Semaforo = (typeof SEMAFORO)[keyof typeof SEMAFORO];
