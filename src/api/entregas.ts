import axiosClient from "./axiosClient";

/**
 * Entregas: el despacho real de insumos a una persona.
 *
 * Una entrega tiene tres niveles, y conviene no confundirlos:
 *
 *   Entrega          el acto: persona, receptor, fecha, quién entregó.
 *   DetalleEntrega   un renglón por insumo entregado.
 *   LoteDeRenglon    de qué lotes salió cada renglón y cuánto de cada uno.
 *
 * Una entrega puede llevar VARIOS insumos, porque así ocurre en la
 * ventanilla: si la receta indica acetaminofén y jarabe, la persona firma un
 * solo renglón del formulario y se toma una sola foto. Partirlo en dos
 * entregas registraría dos actos donde hubo uno.
 *
 * Hay dos caminos hacia una entrega, y no se mezclan nunca dentro de la
 * misma:
 *
 * - **Entrega directa** (`detalle_solicitud_id` en null en cada renglón):
 *   medicina y comida por donación directa. La persona llega, hay
 *   existencias, se le entrega. No hay solicitud porque no hay nada que
 *   aprobar; la constancia son la receta y el formulario firmado, que se
 *   adjuntan como evidencias de la entrega.
 * - **Despacho de una solicitud** (`detalle_solicitud_id` con valor): equipo
 *   que pasó por solicitud, formularios y aprobación.
 *
 * El motivo de no mezclarlos es la evidencia: la medicina se respalda con
 * receta y el equipo con contrato firmado, y una entrega mezclada tendría
 * documentos que cubren solo una parte sin que se sepa cuál. La base lo
 * rechaza además de esta capa.
 *
 * El backend NO elige lotes ni presentación: sp_agregar_insumo_entrega
 * recorre v_inventario_lote_fifo (FEFO con respaldo FIFO) y hace el reparto.
 * La interfaz solo previsualiza ese orden con GET /entregas/lotes-fifo —
 * nunca deja elegir un lote a mano.
 */

/* ═══════════════════════════ Tipos del módulo ═══════════════════════════ */

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
  fecha_caducidad: string | null;
}

/**
 * Un insumo entregado. `detalle_solicitud_id` distingue el origen: con valor
 * despacha una línea de solicitud, en null es entrega directa.
 *
 * `tiene_prestamo` sirve para decidir si ofrecer «Registrar préstamo» sobre
 * este renglón, y también explica por qué a veces no se puede anular.
 */
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
  /**
   * La línea de solicitud que despacha, o null/ausente en entrega directa.
   * Dentro de una entrega, o todos los renglones la traen, o ninguno.
   */
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

/**
 * Anula un solo insumo y deja el resto de la entrega en pie. El backend la
 * rechaza si el renglón tiene un préstamo vigente, o si el préstamo ya se
 * devolvió y su stock por tanto ya volvió al inventario.
 */
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
