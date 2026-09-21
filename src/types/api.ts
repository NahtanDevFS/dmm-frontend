/**
 * Tipos del API — Sistema DMM Usumatlán
 * Formas transversales (paginación, sesión, roles, entidades multicomponente)
 */

/* Paginación  */

/**
 * Sobre uniforme de listados de negocio (espejo de RespuestaPaginada<T>)
 * Usado por listas paginadas, excepto catálogos de selección
 */
export interface Sobre<T> {
  total: number;
  limite: number;
  desplazamiento: number;
  /** Calculado por el servidor para evitar repetir aritmética en el cliente */
  hay_mas: boolean;
  datos: T[];
}

export const LIMITE_MAXIMO = 200;
export const LIMITE_POR_DEFECTO = 50;

/* Errores */

export interface RespuestaError {
  message: string;
  /** Detalle por campo solo en respuestas de validación */
  errores?: Record<string, string[]>;
}

/* Roles y sesión */

export const ROL = {
  EMPLEADO_DMM: "EMPLEADO_DMM",
  DIRECTORA: "DIRECTORA",
  ALCALDE: "ALCALDE",
  ADMINISTRADOR: "ADMINISTRADOR",
} as const;

export type Rol = (typeof ROL)[keyof typeof ROL];

/**
 * Conjuntos de autorización (espejo de backend)
 * Nombrados por intención, restringen opciones de interfaz sin suplir al backend
 */

/** Cualquier usuario autenticado para sesión y contraseña propia */
export const TODOS: readonly Rol[] = [
  ROL.EMPLEADO_DMM,
  ROL.DIRECTORA,
  ROL.ALCALDE,
  ROL.ADMINISTRADOR,
];

/**
 * Operación diaria excluyendo al ALCALDE
 * Incluye beneficiarios, inventario, solicitudes, entregas y préstamos
 */
export const OPERACION: readonly Rol[] = [
  ROL.EMPLEADO_DMM,
  ROL.DIRECTORA,
  ROL.ADMINISTRADOR,
];

/** Decisiones exclusivas de dirección (catálogos, aprobaciones, anulaciones) */
export const DIRECCION: readonly Rol[] = [ROL.DIRECTORA, ROL.ADMINISTRADOR];

/** Módulo exclusivo de reportes, de solo lectura, donde entra ALCALDE */
export const REPORTES: readonly Rol[] = [
  ROL.DIRECTORA,
  ROL.ALCALDE,
  ROL.ADMINISTRADOR,
];

/**
 * Administración del sistema (usuarios, roles, auditoría)
 * Incluye a DIRECTORA por requerimiento del negocio
 */
export const ADMINISTRACION: readonly Rol[] = [
  ROL.DIRECTORA,
  ROL.ADMINISTRADOR,
];

/**
 * Resolución de solicitudes exclusivamente por DIRECTORA en interfaz
 * Se aparta intencionalmente del backend que admite también ADMINISTRADOR
 */
export const RESOLUCION_SOLICITUD: readonly Rol[] = [ROL.DIRECTORA];

export function tieneRol(
  rol: Rol | string | undefined,
  permitidos: readonly Rol[],
): boolean {
  return rol !== undefined && (permitidos as readonly string[]).includes(rol);
}

/** Datos devueltos por POST /auth/login y GET /auth/me */
export interface UsuarioSesion {
  id: number;
  /** Identificador de acceso ASCII sin tildes ni espacios */
  username: string;
  /** Nombre de la persona (puede ser nulo en cuentas antiguas) */
  nombre_completo: string | null;
  rol: Rol;
  /**
   * Programa a cargo, preselecciona el campo al crear solicitud
   * Nulo para Directora, Alcalde y Administrador
   */
  programa_id: number | null;
  programa_nombre: string | null;
}

export interface RespuestaSesion {
  usuario: UsuarioSesion;
}

/* Catálogos */

/** Estructura base para catálogos con CRUD genérico */
export interface ElementoCatalogo {
  id: number;
  nombre: string;
  activo: boolean;
}

/** Catálogo específico que incluye descripción */
export interface Programa extends ElementoCatalogo {
  descripcion: string | null;
}

/** Catálogo específico que incluye datos de contacto */
export interface InstitucionDonante extends ElementoCatalogo {
  telefono: string | null;
  correo: string | null;
}

export type Departamento = ElementoCatalogo;

export interface Municipio extends ElementoCatalogo {
  departamento_id: number;
}

/** Entidad con clave única compuesta por nombre y municipio_id */
export interface Comunidad extends ElementoCatalogo {
  municipio_id: number;
  ubicacion: string | null;
}

/* Beneficiarios */

/**
 * Datos de persona devueltos en listados
 * Refleja SELECT_PUBLICO del repositorio en el backend
 */
export interface Persona {
  id: number;
  cui_dpi: string | null;
  nombres: string;
  apellidos: string;
  /** Fecha ISO 8601, requiere encargado si es menor sin DPI */
  fecha_nacimiento: string;
  genero_id: number | null;
  comunidad_id: number | null;
  telefono: string | null;
  /**
   * Datos de sección I del estudio socioeconómico
   * Centralizados aquí para evitar duplicación en formularios
   */
  direccion: string | null;
  estado_civil_id: number | null;
  grado_academico_id: number | null;
  ocupacion_id: number | null;
  /**
   * Municipio de nacimiento
   * Distinto de la comunidad actual de residencia
   */
  municipio_nacimiento_id: number | null;
  activo: boolean;
}

/* Inventario */

/**
 * Semáforo de caducidad
 * GRIS indica productos sin fecha de caducidad aplicable
 */
export const SEMAFORO = {
  VENCIDO: "VENCIDO",
  ROJO: "ROJO",
  AMARILLO: "AMARILLO",
  VERDE: "VERDE",
  GRIS: "GRIS",
} as const;

export type Semaforo = (typeof SEMAFORO)[keyof typeof SEMAFORO];
