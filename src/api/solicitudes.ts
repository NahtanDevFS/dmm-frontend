import axiosClient from "./axiosClient";

/**
 * Solicitudes de apoyo: la cabecera del trámite, sus líneas por insumo y las
 * recetas médicas que las respaldan.
 *
 * Registrar y dar seguimiento es OPERACION, como el resto del trabajo diario.
 * Aprobar y rechazar es DIRECCION en el backend, pero la interfaz se aparta a
 * propósito y solo se lo ofrece a DIRECTORA (types/api.ts, RESOLUCION_SOLICITUD):
 * es decisión de negocio, no del servidor.
 */

/*Tipos del módulo */

/** Estados posibles de una LÍNEA. Los asigna la base según el stock real. */
export const ESTADO_LINEA = {
  PENDIENTE_ADQUISICION: "PENDIENTE_ADQUISICION",
  PENDIENTE_ENTREGA: "PENDIENTE_ENTREGA",
  PENDIENTE_ENTREGA_PARCIAL: "PENDIENTE_ENTREGA_PARCIAL",
  APROBADA: "APROBADA",
  RECHAZADA: "RECHAZADA",
  ENTREGADA: "ENTREGADA",
  CANCELADA: "CANCELADA",
} as const;

export type EstadoLinea = (typeof ESTADO_LINEA)[keyof typeof ESTADO_LINEA];

/** Cabecera del trámite. Un beneficiario, un programa, una fecha. */
export interface Solicitud {
  id: number;
  persona_id: number;
  programa_id: number;
  fecha_solicitud: string;
  requiere_aprobacion: boolean;
  aprobada: boolean;
  /** Refleja el AVANCE DEL DESPACHO, no la aprobación. Ver `aprobada` para eso. */
  estado_id: number;
  fecha_aprobacion: string | null;
  aprobado_por: number | null;
  observaciones_trabajo_social: string | null;
  activo: boolean;
}

/** Renglón por insumo dentro de una solicitud. */
export interface LineaSolicitud {
  id: number;
  solicitud_id: number;
  insumo_id: number;
  cantidad_requerida: number;
  cantidad_entregada: number;
  /** Id del catálogo estado_solicitud_apoyo. El nombre no viaja aquí. */
  estado_id: number;
  fecha_asignacion: string | null;
  receta_medica_id: number | null;
  /** Donación o préstamo. Inmutable: la base rechaza cambiarla. */
  modalidad_solicitud_id: number;
  /** Cómo se expresó el pedido, si fue por presentación. */
  presentacion_solicitud_id: number | null;
  cantidad_presentacion: string | null;
  activo: boolean;
}

export interface RecetaMedica {
  id: number;
  solicitud_id: number;
  ruta_archivo: string;
  fecha_emision: string | null;
  observaciones: string | null;
  activo: boolean;
}

/**
 * Un documento del legajo: el respaldo en papel del trámite. Formularios
 * firmados, hojas de firma, recetas, constancias.
 *
 * `formulario_id` dice a cuál de los formularios corresponde el escaneo, y es
 * opcional: no todo lo que se adjunta es uno de ellos.
 */
export interface DocumentoSolicitud {
  id: number;
  solicitud_id: number;
  formulario_id: number | null;
  ruta_archivo: string;
  descripcion: string | null;
  observaciones: string | null;
  activo: boolean;
}

/** Lo que devuelve GET /solicitudes/:id: la cabecera con sus sub-recursos. */
export interface SolicitudDetalle extends Solicitud {
  lineas: LineaSolicitud[];
  /**
   * Residuo del diseño anterior, cuando la medicina pasaba por solicitud. Con
   * el flujo actual la receta se adjunta como evidencia de la entrega
   * directa, o aquí mismo como un documento más del legajo.
   */
  recetas: RecetaMedica[];
  documentos: DocumentoSolicitud[];
}

/**
 * Una fila de v_solicitudes_activas: una LÍNEA con nombres ya resueltos y el
 * estado de su cabecera para contexto. La vista está a nivel de línea, no de
 * solicitud, porque un trámite puede pedir varios insumos y cada uno avanza
 * por su cuenta; excluye ENTREGADA y CANCELADA.
 */
export interface LineaSolicitudActiva {
  solicitud_id: number;
  detalle_solicitud_id: number;
  persona_id: number;
  persona_nombre_completo: string;
  programa_nombre: string;
  insumo_nombre: string;
  cantidad_requerida: number;
  cantidad_entregada: number;
  fecha_solicitud: string;
  estado_linea: EstadoLinea;
  estado_cabecera: string;
  requiere_aprobacion: boolean;
  aprobada: boolean;
  fecha_aprobacion: string | null;
  aprobado_por_username: string | null;
}

export interface DatosLineaNueva {
  insumo_id: number;
  /**
   * En unidad base. Se omite cuando se pide por presentación: en ese caso el
   * backend hace la conversión, para que el número que gobierna stock y
   * despacho no dependa de que el navegador multiplicara bien.
   */
  cantidad_requerida?: number;
  /** "2 cajas": van juntas o no van. */
  presentacion_solicitud_id?: number;
  cantidad_presentacion?: number;
  /**
   * Bajo qué figura se entrega: donación definitiva o préstamo. Decide qué
   * formularios se van a exigir y no se puede cambiar después — si la figura
   * cambia, es una solicitud nueva.
   */
  modalidad_solicitud_id: number;
}

export interface DatosSolicitud {
  persona_id: number;
  programa_id: number;
  /** Opcional: la base pone CURRENT_DATE y rechaza fechas futuras. */
  fecha_solicitud?: string;
  requiere_aprobacion?: boolean;
  observaciones_trabajo_social?: string | null;
  lineas: DatosLineaNueva[];
}

export interface FiltrosSolicitudes {
  personaId?: number;
  programaId?: number;
  estadoLinea?: EstadoLinea;
  soloPendientesAprobacion?: boolean;
}

/* ═══════════════════════════ Cliente ═══════════════════════════ */

export const CLAVE_SOLICITUDES = "solicitudes";

export async function obtenerSolicitud(id: number): Promise<SolicitudDetalle> {
  const { data } = await axiosClient.get<SolicitudDetalle>("solicitudes/" + id);
  return data;
}

export async function crearSolicitud(
  datos: DatosSolicitud,
): Promise<{ solicitud: Solicitud; lineas: LineaSolicitud[] }> {
  const { data } = await axiosClient.post<{
    solicitud: Solicitud;
    lineas: LineaSolicitud[];
  }>("solicitudes", datos);
  return data;
}

export async function editarSolicitud(
  id: number,
  datos: {
    programa_id?: number;
    requiere_aprobacion?: boolean;
    observaciones_trabajo_social?: string | null;
  },
): Promise<Solicitud> {
  const { data } = await axiosClient.patch<Solicitud>(
    "solicitudes/" + id,
    datos,
  );
  return data;
}

/* ── Resolución (aprobar / rechazar) ── */

export async function aprobarSolicitud(id: number): Promise<Solicitud> {
  const { data } = await axiosClient.post<Solicitud>(
    "solicitudes/" + id + "/aprobar",
  );
  return data;
}

export async function rechazarSolicitud(
  id: number,
  motivo: string,
): Promise<Solicitud> {
  const { data } = await axiosClient.post<Solicitud>(
    "solicitudes/" + id + "/rechazar",
    { motivo },
  );
  return data;
}

/**
 * Cancela el trámite completo: todas sus líneas activas, vía
 * sp_cancelar_solicitud_completa. El motivo es opcional y queda en
 * observaciones_trabajo_social.
 */
export async function cancelarSolicitud(
  id: number,
  motivo?: string,
): Promise<SolicitudDetalle> {
  const { data } = await axiosClient.post<SolicitudDetalle>(
    "solicitudes/" + id + "/cancelar",
    motivo ? { motivo } : undefined,
  );
  return data;
}

/* ── Líneas ── */

export async function listarLineas(
  solicitudId: number,
  incluirInactivas = false,
): Promise<LineaSolicitud[]> {
  const { data } = await axiosClient.get<LineaSolicitud[]>(
    "solicitudes/" + solicitudId + "/lineas",
    { params: incluirInactivas ? { incluirInactivas: "true" } : undefined },
  );
  return data;
}

export async function agregarLinea(
  solicitudId: number,
  datos: DatosLineaNueva,
): Promise<LineaSolicitud> {
  const { data } = await axiosClient.post<LineaSolicitud>(
    "solicitudes/" + solicitudId + "/lineas",
    datos,
  );
  return data;
}

export async function editarLinea(
  solicitudId: number,
  lineaId: number,
  datos: { cantidad_requerida?: number; receta_medica_id?: number | null },
): Promise<LineaSolicitud> {
  const { data } = await axiosClient.patch<LineaSolicitud>(
    "solicitudes/" + solicitudId + "/lineas/" + lineaId,
    datos,
  );
  return data;
}

export async function cancelarLinea(
  solicitudId: number,
  lineaId: number,
  motivo?: string,
): Promise<LineaSolicitud> {
  const { data } = await axiosClient.post<LineaSolicitud>(
    "solicitudes/" + solicitudId + "/lineas/" + lineaId + "/cancelar",
    motivo ? { motivo } : undefined,
  );
  return data;
}

/* ── Recetas médicas ── */

export async function listarRecetas(
  solicitudId: number,
): Promise<RecetaMedica[]> {
  const { data } = await axiosClient.get<RecetaMedica[]>(
    "solicitudes/" + solicitudId + "/recetas",
  );
  return data;
}

/**
 * Sube una receta. Va como multipart y el archivo viaja en el campo
 * `archivo`, el nombre que espera el middleware del backend.
 */
export async function subirReceta(
  solicitudId: number,
  datos: { archivo: File; fechaEmision?: string; observaciones?: string },
): Promise<RecetaMedica> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", datos.archivo);
  if (datos.fechaEmision) cuerpo.append("fecha_emision", datos.fechaEmision);
  if (datos.observaciones) cuerpo.append("observaciones", datos.observaciones);

  const { data } = await axiosClient.post<RecetaMedica>(
    "solicitudes/" + solicitudId + "/recetas",
    cuerpo,
  );
  return data;
}

/**
 * Descarga el expediente completo de la solicitud en PDF.
 *
 * Mismo tratamiento que los reportes: con responseType "blob" axios no puede
 * distinguir un archivo real de un error JSON hasta después de recibirlo, así
 * que si el content-type no es PDF se relee el blob como texto y se relanza
 * como error normal para que mensajeDeError lo entienda.
 */
export async function descargarExpediente(solicitudId: number): Promise<void> {
  const respuesta = await axiosClient.get(
    "solicitudes/" + solicitudId + "/expediente.pdf",
    { responseType: "blob" },
  );

  const tipo = respuesta.headers["content-type"] as string | undefined;
  if (tipo?.includes("application/json")) {
    const texto = await (respuesta.data as Blob).text();
    const cuerpo: unknown = JSON.parse(texto);
    const mensaje =
      typeof cuerpo === "object" && cuerpo !== null && "message" in cuerpo
        ? String((cuerpo as { message: unknown }).message)
        : "No se pudo generar el expediente.";
    throw new Error(mensaje);
  }

  const url = URL.createObjectURL(respuesta.data as Blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "expediente-solicitud-" + solicitudId + ".pdf";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export async function subirDocumentoSolicitud(
  solicitudId: number,
  datos: { archivo: File; formularioId?: number; descripcion?: string },
): Promise<DocumentoSolicitud> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", datos.archivo);
  if (datos.formularioId)
    cuerpo.append("formulario_id", String(datos.formularioId));
  if (datos.descripcion) cuerpo.append("descripcion", datos.descripcion);

  const { data } = await axiosClient.post<DocumentoSolicitud>(
    "solicitudes/" + solicitudId + "/documentos",
    cuerpo,
  );
  return data;
}

/** Baja lógica: devuelve el legajo ya actualizado. */
export async function eliminarDocumentoSolicitud(
  solicitudId: number,
  documentoId: number,
): Promise<DocumentoSolicitud[]> {
  const { data } = await axiosClient.delete<DocumentoSolicitud[]>(
    "solicitudes/" + solicitudId + "/documentos/" + documentoId,
  );
  return data;
}

/** Elimina (baja lógica) y devuelve la lista de recetas ya actualizada. */
export async function eliminarReceta(
  solicitudId: number,
  recetaId: number,
): Promise<RecetaMedica[]> {
  const { data } = await axiosClient.delete<RecetaMedica[]>(
    "solicitudes/" + solicitudId + "/recetas/" + recetaId,
  );
  return data;
}
