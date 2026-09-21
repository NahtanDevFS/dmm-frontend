import axiosClient from "./axiosClient";

/**
 * Entregas físicas: gestiona cabeceras, detalles por insumo y asignación de lotes (FEFO/FIFO)
 * Evita mezclar entregas directas (medicinas/víveres) con despachos de solicitudes
 */

/* Tipos del módulo */

/** Cabecera de una entrega ya registrada. */
export interface Entrega {
  id: number;
  persona_id: number;
  persona_receptor_id: number | null;
  tipo_parentesco_receptor_id: number | null;
  fecha_entrega: string;
  usuario_entrega_id: number;
  observaciones: string | null;
  activo: boolean;
}

/** De qué lote salió una parte del renglón, y cuánto. */
export interface LoteDeRenglon {
  id: number;
  detalle_inventario_lote_id: number;
  presentacion_despacho_id: number;
  cantidad_despacho_original: string;
  cantidad_entregada: number;
  activo: boolean;
  codigo_lote: string | null;
  /** Número de serie del fabricante (identifica unidades precisas, distinto a código de lote) */
  numero_serie: string | null;
  fecha_caducidad: string | null;
}

/** Renglón de insumo entregado, detalle_solicitud_id nulo indica entrega directa */
export interface DetalleEntrega {
  id: number;
  insumo_id: number;
  insumo_nombre: string;
  detalle_solicitud_id: number | null;
  solicitud_id: number | null;
  cantidad_entregada: number;
  activo: boolean;
  motivo_anulacion: string | null;
  fecha_anulacion: string | null;
  tiene_prestamo: boolean;
  /** Si el insumo lleva serie por unidad: cambia cómo se rotula cada lote. */
  serie_por_unidad: boolean;
  /** Préstamo ya devuelto (bloquea la anulación para evitar sumas dobles en inventario) */
  prestamo_devuelto: boolean;
  lotes: LoteDeRenglon[];
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
  entregado_por: string;
  observaciones: string | null;
  activo: boolean;
  total_entregado: number;
  /** Nombres de los insumos entregados, separados por coma. */
  insumos: string;
  /** Solicitud de la que salió, o null si fue una entrega directa. */
  solicitud_id: number | null;
  /** Cuántos renglones se anularon sin anular la entrega entera. */
  renglones_anulados: number;
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

/** Un insumo a entregar dentro de la misma entrega. */
export interface RenglonEntrega {
  insumo_id: number;
  cantidad: number;
  /** Línea origen de la solicitud (todas las filas deben coincidir en tenerlo o no) */
  detalle_solicitud_id?: number | null;
}

export interface DatosEntrega {
  persona_id: number;
  /** Al menos uno. El backend registra una sola entrega con todos ellos. */
  insumos: RenglonEntrega[];
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

/* Cliente */

export const CLAVE_ENTREGAS = "entregas";

/** Obtiene la entrega y sus sub-recursos (detalles y evidencias) */
export async function obtenerEntrega(id: number): Promise<EntregaDetalle> {
  const { data } = await axiosClient.get<EntregaDetalle>("entregas/" + id);
  return data;
}

/** Previsualización de orden FEFO/FIFO al momento actual, solo lectura */
export async function listarLotesFifo(insumoId: number): Promise<LoteFifo[]> {
  const { data } = await axiosClient.get<LoteFifo[]>("entregas/lotes-fifo", {
    params: { insumoId },
  });
  return data;
}

/** Registra una entrega consumiendo inventario (FEFO/FIFO automático) */
export async function registrarEntrega(
  datos: DatosEntrega,
): Promise<EntregaDetalle> {
  const { data } = await axiosClient.post<EntregaDetalle>("entregas", datos);
  return data;
}

/** Anula la entrega completa: todos sus renglones y todo su inventario. */
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

/** Anulación parcial de insumo, rechazada por backend si hay préstamos vinculados */
export async function anularDetalleEntrega(
  entregaId: number,
  detalleId: number,
  motivo: string,
): Promise<EntregaDetalle> {
  const { data } = await axiosClient.post<EntregaDetalle>(
    "entregas/" + entregaId + "/detalles/" + detalleId + "/anular",
    { motivo },
  );
  return data;
}

/* Evidencias */

export async function listarEvidencias(
  entregaId: number,
): Promise<EvidenciaEntrega[]> {
  const { data } = await axiosClient.get<EvidenciaEntrega[]>(
    "entregas/" + entregaId + "/evidencias",
  );
  return data;
}

/** Sube evidencia como multipart (`archivo`) */
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
