import axiosClient from "./axiosClient";

/**
 * Auditoría: bitácora de solo lectura de cada INSERT/UPDATE/DELETE del
 * sistema. Exclusivo de ADMINISTRADOR — el log contiene el contenido
 * completo de cada fila modificada, y nada aquí se edita ni se borra: los
 * triggers de la base son los únicos que escriben en ella.
 *
 * password_hash y token_hash ya vienen redactados por el backend
 * ("[redactado]") antes de llegar aquí, así que el frontend nunca los ve.
 *
 * El listado paginado (GET /auditoria) pasa por useListadoPaginado, igual
 * que el resto de listados del sistema: aquí solo van las consultas que ese
 * hook no cubre.
 */

export type AccionAuditoria = "INSERT" | "UPDATE" | "DELETE";

export interface RegistroAuditoria {
  id: string;
  tabla_afectada: string;
  registro_id: number;
  accion: AccionAuditoria;
  usuario_id: number | null;
  usuario_username: string | null;
  fecha_hora: string;
  valores_antiguos: Record<string, unknown> | null;
  valores_nuevos: Record<string, unknown> | null;
}

export interface TablaAuditada {
  tabla: string;
  registros: number;
}

export const CLAVE_AUDITORIA = "auditoria";

export async function listarTablasAuditadas(): Promise<TablaAuditada[]> {
  const { data } = await axiosClient.get<TablaAuditada[]>("auditoria/tablas");
  return data;
}

/** Historial completo de un registro concreto, del más antiguo al más reciente. */
export async function historialDeRegistro(
  tabla: string,
  registroId: number,
): Promise<{ total: number; datos: RegistroAuditoria[] }> {
  const { data } = await axiosClient.get<{
    total: number;
    datos: RegistroAuditoria[];
  }>("auditoria/" + tabla + "/" + registroId);
  return data;
}
