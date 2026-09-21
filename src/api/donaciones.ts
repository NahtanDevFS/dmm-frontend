import axiosClient from "./axiosClient";

/**
 * Donaciones: recepciones, lotes de inventario y documentos de respaldo
 * Módulo de OPERACION (tareas de bodega al recibir insumos)
 */

/* Tipos del módulo */

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
 * Renglón de inventario recibido
 * Cantidades inicial/disponible son calculadas por DB (trg_calcular_recepcion_lote)
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
 * Línea de solicitud esperando existencias (v_lista_espera)
 * Utilizada para contar cuántas solicitudes se destraban al registrar un lote
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

/* Cliente */

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

/* Lotes */

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
 * Ingresa múltiples unidades identificables de un insumo (una por número de serie)
 * Equivalente a crearLote para equipo serializado, registrando qué unidades llegan
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

/* Documentos de respaldo */

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

/* Lista de espera */

/**
 * Líneas de solicitud esperando existencias filtrables por nombre
 * El filtro de servidor (ILIKE) requiere afinación exacta en el cliente
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
