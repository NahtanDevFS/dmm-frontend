import axiosClient from "./axiosClient";

/**
 * Bitácora de lectura de INSERT/UPDATE/DELETE exclusiva de administrador
 * Las consultas paginadas usan useListadoPaginado, aquí van otras consultas
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

/** Historial completo de un registro desde el más antiguo al más reciente */
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
