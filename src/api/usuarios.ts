import axiosClient from "./axiosClient";

/**
 * Gestión de usuarios y contraseñas reservada para ADMINISTRACION
 * Reglas de negocio validadas en backend para evitar manipulación de propios accesos
 */

/* Tipos del módulo */

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
}

/** password_hash nunca sale del backend, ni siquiera hacia un ADMINISTRADOR. */
export interface Usuario {
  id: number;
  /** Identificador de acceso: ASCII, sin tildes ni espacios. */
  username: string;
  /** Nombre completo, nulo en cuentas antiguas (interfaz usa username como fallback) */
  nombre_completo: string | null;
  rol_id: number;
  rol_nombre: string;
  /** Programa a su cargo, si lleva alguno. */
  programa_id: number | null;
  programa_nombre: string | null;
  ultimo_login: string | null;
  activo: boolean;
}

export interface DatosCrearUsuario {
  username: string;
  nombre_completo: string;
  password: string;
  rol_id: number;
  programa_id?: number | null;
}

export interface DatosEditarUsuario {
  username?: string;
  nombre_completo?: string;
  rol_id?: number;
  programa_id?: number | null;
}

export interface FiltrosUsuarios {
  rolId?: number;
  busqueda?: string;
  incluirInactivos?: boolean;
}

/* Cliente */

export const CLAVE_USUARIOS = "usuarios";
export const CLAVE_ROLES = "roles";

export async function listarRoles(): Promise<Rol[]> {
  const { data } = await axiosClient.get<Rol[]>("roles");
  return data;
}

export async function obtenerUsuario(id: number): Promise<Usuario> {
  const { data } = await axiosClient.get<Usuario>("usuarios/" + id);
  return data;
}

export async function crearUsuario(datos: DatosCrearUsuario): Promise<Usuario> {
  const { data } = await axiosClient.post<Usuario>("usuarios", datos);
  return data;
}

export async function editarUsuario(
  id: number,
  datos: DatosEditarUsuario,
): Promise<Usuario> {
  const { data } = await axiosClient.patch<Usuario>("usuarios/" + id, datos);
  return data;
}

export async function desactivarUsuario(id: number): Promise<Usuario> {
  const { data } = await axiosClient.patch<Usuario>(
    "usuarios/" + id + "/desactivar",
  );
  return data;
}

export async function reactivarUsuario(id: number): Promise<Usuario> {
  const { data } = await axiosClient.patch<Usuario>(
    "usuarios/" + id + "/reactivar",
  );
  return data;
}

/** Reseteo por administrador: cierra todas las sesiones del usuario afectado. */
export async function resetearPassword(
  id: number,
  passwordNueva: string,
): Promise<{ message: string }> {
  const { data } = await axiosClient.patch<{ message: string }>(
    "usuarios/" + id + "/password",
    { password_nueva: passwordNueva },
  );
  return data;
}

/** Cambio propio: exige la contraseña actual; conserva la sesión desde la que se pide. */
export async function cambiarPasswordPropia(datos: {
  password_actual: string;
  password_nueva: string;
}): Promise<{ message: string }> {
  const { data } = await axiosClient.patch<{ message: string }>(
    "usuarios/mi-password",
    datos,
  );
  return data;
}
