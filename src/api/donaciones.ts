import axiosClient from "./axiosClient";

/**
 * Donaciones: recepciones, sus lotes de inventario y sus documentos de
 * respaldo.
 *
 * Todo el módulo es de OPERACION, sin excepciones. Recibir una donación es
 * trabajo de bodega y lo hace quien está ahí cuando llega el camión, no
 * dirección; se aparta en eso del catálogo de insumos, que sí es dato maestro.
 */

/* ═══════════════════════════ Tipos del módulo ═══════════════════════════ */

/** Cabecera de la recepción. Una entrega de una institución en una fecha. */
export interface Recepcion {
  id: number;
  /** Código con que la institución identifica el envío. No es del fabricante. */
  codigo_lote: string | null;
  fecha_recepcion: string;
  institucion_id: number;
  observaciones_generales: string | null;
  activo: boolean;
}

/**
 * Renglón de inventario recibido.
 *
 * `cantidad_recepcion_original` y `unidades_por_presentacion_lote` llegan como
 * texto: son numeric(12,4) en Postgres y el driver los entrega sin convertir
 * para no perder decimales por el camino.
 *
 * `cantidad_inicial` y `cantidad_disponible` **no se envían al crear**: las
 * calcula trg_calcular_recepcion_lote como
 * FLOOR(cantidad_recepcion_original × unidades_por_presentacion_lote).
 */
export interface LoteRecepcion {
  id: number;
  insumo_id: number;
  recepcion_lote_id: number;
  presentacion_recepcion_id: number;
  marca_id: number | null;
  cantidad_recepcion_original: string;
  unidades_por_presentacion_lote: string;
  cantidad_inicial: number;
  cantidad_disponible: number;
  codigo_lote_fabricante: string | null;
  fecha_caducidad: string | null;
  observaciones: string | null;
  activo: boolean;
}

export interface DocumentoRecepcion {
  id: number;
  recepcion_lote_id: number;
  ruta_archivo: string;
  descripcion: string | null;
  activo: boolean;
}

/** Lo que devuelve GET /recepciones/:id: la cabecera con sus sub-recursos. */
export interface RecepcionDetalle extends Recepcion {
  lotes: LoteRecepcion[];
  documentos: DocumentoRecepcion[];
}

export interface DatosRecepcion {
  institucion_id: number;
  codigo_lote?: string | null;
  /** Opcional: la base pone CURRENT_DATE y rechaza fechas futuras. */
  fecha_recepcion?: string;
  observaciones_generales?: string | null;
}

export interface DatosLote {
  insumo_id: number;
  presentacion_recepcion_id: number;
  cantidad_recepcion_original: number;
  unidades_por_presentacion_lote: number;
  marca_id?: number | null;
  codigo_lote_fabricante?: string | null;
  fecha_caducidad?: string | null;
  observaciones?: string | null;
}

/**
 * Una línea de solicitud esperando existencias, tal como la expone
 * v_lista_espera. Aquí se usa solo para contar: es lo que permite saber a
 * cuántas personas destrabó el lote que se acaba de registrar.
 */
export interface LineaEnEspera {
  detalle_solicitud_id: number;
  solicitud_id: number;
  persona_id: number;
  persona_nombre_completo: string;
  insumo_nombre: string;
  cantidad_requerida: number;
  cantidad_entregada: number;
  /** PENDIENTE_ADQUISICION o PENDIENTE_ENTREGA_PARCIAL. */
  estado: string;
  fecha_ingreso_espera: string;
  dias_esperando: number;
}

/** Estado del que saca a una línea la llegada de existencias. */
export const EN_ESPERA_DE_STOCK = "PENDIENTE_ADQUISICION";

/* ═══════════════════════════ Cliente ═══════════════════════════ */

export const CLAVE_RECEPCIONES = "recepciones";

export async function obtenerRecepcion(id: number): Promise<RecepcionDetalle> {
  const { data } = await axiosClient.get<RecepcionDetalle>("recepciones/" + id);
  return data;
}

export async function crearRecepcion(
  datos: DatosRecepcion,
): Promise<Recepcion> {
  const { data } = await axiosClient.post<Recepcion>("recepciones", datos);
  return data;
}

export async function editarRecepcion(
  id: number,
  datos: Partial<DatosRecepcion>,
): Promise<Recepcion> {
  const { data } = await axiosClient.patch<Recepcion>(
    "recepciones/" + id,
    datos,
  );
  return data;
}

export async function desactivarRecepcion(id: number): Promise<void> {
  await axiosClient.patch("recepciones/" + id + "/desactivar");
}

export async function reactivarRecepcion(id: number): Promise<void> {
  await axiosClient.patch("recepciones/" + id + "/reactivar");
}

/* ── Lotes ── */

export async function listarLotes(
  recepcionId: number,
  incluirInactivos = false,
): Promise<LoteRecepcion[]> {
  const { data } = await axiosClient.get<LoteRecepcion[]>(
    "recepciones/" + recepcionId + "/lotes",
    { params: incluirInactivos ? { incluirInactivos: "true" } : undefined },
  );
  return data;
}

export async function crearLote(
  recepcionId: number,
  datos: DatosLote,
): Promise<LoteRecepcion> {
  const { data } = await axiosClient.post<LoteRecepcion>(
    "recepciones/" + recepcionId + "/lotes",
    datos,
  );
  return data;
}

/**
 * Ingresa varias unidades identificables de un insumo, una fila por número de
 * serie.
 *
 * Es el equivalente de crearLote para el equipo serializado, y va aparte
 * porque lo que se pregunta es distinto: no cuánto llegó sino cuáles
 * llegaron. Cinco sillas son cinco unidades con cinco series, no un lote de
 * cinco — y sin eso, al prestar una no hay forma de saber cuál salió.
 */
export async function crearUnidades(
  recepcionId: number,
  datos: {
    insumo_id: number;
    presentacion_recepcion_id: number;
    marca_id?: number | null;
    fecha_caducidad?: string | null;
    observaciones?: string | null;
    series: string[];
  },
): Promise<LoteRecepcion[]> {
  const { data } = await axiosClient.post<LoteRecepcion[]>(
    "recepciones/" + recepcionId + "/unidades",
    datos,
  );
  return data;
}

/* ── Documentos de respaldo ── */

export async function listarDocumentosRecepcion(
  recepcionId: number,
): Promise<DocumentoRecepcion[]> {
  const { data } = await axiosClient.get<DocumentoRecepcion[]>(
    "recepciones/" + recepcionId + "/documentos",
  );
  return data;
}

/**
 * Sube un documento. Va como multipart y el archivo viaja en el campo
 * `archivo`, que es el nombre que espera el middleware del backend.
 */
export async function subirDocumentoRecepcion(
  recepcionId: number,
  datos: { archivo: File; descripcion?: string },
): Promise<DocumentoRecepcion> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", datos.archivo);
  if (datos.descripcion) cuerpo.append("descripcion", datos.descripcion);

  const { data } = await axiosClient.post<DocumentoRecepcion>(
    "recepciones/" + recepcionId + "/documentos",
    cuerpo,
  );
  return data;
}

export async function eliminarDocumentoRecepcion(
  recepcionId: number,
  documentoId: number,
): Promise<void> {
  await axiosClient.delete(
    "recepciones/" + recepcionId + "/documentos/" + documentoId,
  );
}

/* ── Lista de espera ── */

/**
 * Líneas de solicitud esperando existencias. El filtro del servidor es un
 * ILIKE por nombre de insumo, así que puede devolver de más —«Jabón» trae
 * también «Jabón líquido»—; quien la use debe afinar por nombre exacto.
 */
export async function listarListaEspera(
  insumoNombre?: string,
): Promise<LineaEnEspera[]> {
  const { data } = await axiosClient.get<LineaEnEspera[]>(
    "solicitudes/lista-espera",
    { params: insumoNombre ? { insumo: insumoNombre } : undefined },
  );
  return data;
}
