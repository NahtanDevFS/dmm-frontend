import axiosClient from "./axiosClient";

/**
 * Entregas: el despacho real de un insumo contra una línea de solicitud.
 *
 * Desde la migración 14 de la base, toda entrega exige una línea de
 * solicitud existente (detalle_solicitud_id obligatorio): no existe la
 * "entrega libre". El formulario de alta por tanto no pregunta el insumo
 * directamente, sino que parte de elegir una línea pendiente — el insumo, la
 * persona y el máximo que se puede entregar ya vienen fijados por esa línea.
 *
 * El backend NO elige lotes ni presentación: sp_registrar_entrega recorre
 * v_inventario_lote_fifo (FEFO con fallback a FIFO) y hace el reparto. La
 * interfaz solo previsualiza ese orden con GET /entregas/lotes-fifo — nunca
 * deja elegir un lote a mano.
 */

/* ═══════════════════════════ Tipos del módulo ═══════════════════════════ */

/** Cabecera de una entrega ya registrada. */
export interface Entrega {
  id: number;
  detalle_solicitud_id: number | null;
  persona_id: number;
  persona_receptor_id: number | null;
  tipo_parentesco_receptor_id: number | null;
  fecha_entrega: string;
  usuario_entrega_id: number;
  observaciones: string | null;
  activo: boolean;
}

/** Renglón de la entrega: de qué lote salió cada cantidad. */
export interface DetalleEntrega {
  id: number;
  detalle_inventario_lote_id: number;
  presentacion_despacho_id: number;
  cantidad_despacho_original: string;
  cantidad_entregada: number;
  activo: boolean;
  insumo_nombre: string;
  codigo_lote: string | null;
  fecha_caducidad: string | null;
}

export interface EvidenciaEntrega {
  id: number;
  entrega_id: number;
  tipo_evidencia_id: number;
  ruta_archivo: string;
  observaciones: string | null;
  activo: boolean;
}

/** Lo que devuelve GET /entregas/:id: la cabecera con sus sub-recursos. */
export interface EntregaDetalle extends Entrega {
  detalles: DetalleEntrega[];
  evidencias: EvidenciaEntrega[];
}

/** Fila del listado, con nombres ya resueltos (no hay vista; los arma el backend). */
export interface EntregaListado {
  id: number;
  fecha_entrega: string;
  persona_id: number;
  persona_nombre_completo: string;
  persona_receptor_id: number | null;
  receptor_nombre_completo: string | null;
  parentesco_receptor: string | null;
  detalle_solicitud_id: number | null;
  entregado_por: string;
  observaciones: string | null;
  activo: boolean;
  total_entregado: number;
  /** Insumos separados por coma, ya que una entrega puede repartirse en varios lotes. */
  insumos: string;
}

/** Un lote en el orden en que sp_registrar_entrega lo va a consumir. */
export interface LoteFifo {
  detalle_inventario_lote_id: number;
  codigo_lote: string | null;
  fecha_caducidad: string | null;
  fecha_recepcion: string;
  cantidad_disponible: number;
  orden_fifo: string;
}

export interface DatosEntrega {
  persona_id: number;
  insumo_id: number;
  cantidad: number;
  /** Obligatorio: toda entrega parte de una línea de solicitud existente. */
  detalle_solicitud_id: number;
  persona_receptor_id?: number | null;
  tipo_parentesco_receptor_id?: number | null;
  observaciones?: string | null;
}

export interface FiltrosEntregas {
  personaId?: number;
  insumoId?: number;
  desde?: string;
  hasta?: string;
  incluirAnuladas?: boolean;
}

/* ═══════════════════════════ Cliente ═══════════════════════════ */

export const CLAVE_ENTREGAS = "entregas";

export async function obtenerEntrega(id: number): Promise<EntregaDetalle> {
  const { data } = await axiosClient.get<EntregaDetalle>("entregas/" + id);
  return data;
}

/**
 * Vista previa del orden FEFO/FIFO para un insumo: de qué lotes va a salir
 * el despacho si se registra la entrega ahora mismo. Es solo lectura — la
 * base decide de verdad al registrar, con la existencia real en ese momento.
 */
export async function listarLotesFifo(insumoId: number): Promise<LoteFifo[]> {
  const { data } = await axiosClient.get<LoteFifo[]>("entregas/lotes-fifo", {
    params: { insumoId },
  });
  return data;
}

export async function registrarEntrega(
  datos: DatosEntrega,
): Promise<EntregaDetalle> {
  const { data } = await axiosClient.post<EntregaDetalle>("entregas", datos);
  return data;
}

export async function anularEntrega(
  id: number,
  motivo: string,
): Promise<EntregaDetalle> {
  const { data } = await axiosClient.post<EntregaDetalle>(
    "entregas/" + id + "/anular",
    { motivo },
  );
  return data;
}

/* ── Evidencias ── */

export async function listarEvidencias(
  entregaId: number,
): Promise<EvidenciaEntrega[]> {
  const { data } = await axiosClient.get<EvidenciaEntrega[]>(
    "entregas/" + entregaId + "/evidencias",
  );
  return data;
}

/**
 * Sube una evidencia. Va como multipart y el archivo viaja en el campo
 * `archivo`, el nombre que espera el middleware del backend.
 */
export async function subirEvidencia(
  entregaId: number,
  datos: { archivo: File; tipoEvidenciaId: number; observaciones?: string },
): Promise<EvidenciaEntrega> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", datos.archivo);
  cuerpo.append("tipo_evidencia_id", String(datos.tipoEvidenciaId));
  if (datos.observaciones) cuerpo.append("observaciones", datos.observaciones);

  const { data } = await axiosClient.post<EvidenciaEntrega>(
    "entregas/" + entregaId + "/evidencias",
    cuerpo,
  );
  return data;
}

/** Elimina (baja lógica) y devuelve la lista de evidencias ya actualizada. */
export async function eliminarEvidencia(
  entregaId: number,
  evidenciaId: number,
): Promise<EvidenciaEntrega[]> {
  const { data } = await axiosClient.delete<EvidenciaEntrega[]>(
    "entregas/" + entregaId + "/evidencias/" + evidenciaId,
  );
  return data;
}
