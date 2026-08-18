import axiosClient from "./axiosClient";
import type { RespuestaSesion, UsuarioSesion } from "../types/api";

export interface Credenciales {
  username: string;
  password: string;
}

/** Emite la cookie de sesión. 401 significa usuario o contraseña incorrectos. */
export async function iniciarSesion(
  credenciales: Credenciales,
): Promise<UsuarioSesion> {
  const { data } = await axiosClient.post<RespuestaSesion>(
    "auth/login",
    credenciales,
  );
  return data.usuario;
}

/**
 * Recupera la sesión vigente. Imprescindible al arrancar: la cookie
 * dmm_session es HttpOnly, así que JavaScript no puede leerla ni deducir de
 * ella quién está autenticado. Sin esta llamada, recargar la página dejaría al
 * usuario aparentemente fuera aunque su sesión siga viva en el servidor.
 *
 * Un 401 aquí no es un fallo: es la respuesta esperada de «no ha entrado nadie».
 */
export async function obtenerSesion(): Promise<UsuarioSesion> {
  const { data } = await axiosClient.get<RespuestaSesion>("auth/me");
  return data.usuario;
}

/** Revoca la sesión en la base. Idempotente: cerrar dos veces responde 200. */
export async function cerrarSesion(): Promise<void> {
  await axiosClient.post("auth/logout");
}
