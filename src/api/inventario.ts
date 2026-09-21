import axiosClient from "./axiosClient";
import { LIMITE_MAXIMO, type Semaforo, type Sobre } from "../types/api";

/**
 * Inventario: insumos, presentaciones y semáforo de caducidad
 * Consulta (OPERACION), Alta/Edición (DIRECCION), Baja (OPERACION)
 */

/* Tipos del módulo */

/**
 * Insumo tal como lo devuelve el API
 * Banderas se ubican a nivel insumo para admitir productos que caducan o no
 */
export interface Insumo {
  id: number;
  categoria_id: number;
  unidad_medida_base_id: number;
  nombre: string;
  descripcion: string | null;
  requiere_fecha_caducidad: boolean;
  requiere_codigo_fabricante: boolean;
  bloquea_solicitud_sin_stock: boolean;
  /** Determina si cada unidad es serializada y seleccionable individualmente */
  serie_por_unidad: boolean;
  activo: boolean;
}

/** Cuerpo de POST y PATCH /insumos. En el PATCH todo es opcional. */
export interface DatosInsumo {
  categoria_id: number;
  unidad_medida_base_id: number;
  nombre: string;
  descripcion?: string | null;
  requiere_fecha_caducidad?: boolean;
  requiere_codigo_fabricante?: boolean;
  serie_por_unidad?: boolean;
  bloquea_solicitud_sin_stock?: boolean;
}

/**
 * Presentación de recepción de insumo (caja, bolsa, etc)
 * La pantalla resuelve unidad_medida_id contra el catálogo de unidades
 */
export interface PresentacionInsumo {
  id: number;
  insumo_id: number;
  unidad_medida_id: number;
  es_default: boolean;
  /** Unidades base nominales (texto para preservar decimales desde BD) */
  unidades_por_presentacion: string;
  activo: boolean;
}

/** Existencias agregadas por presentación (v_stock_insumo_presentaciones). */
export interface StockPorPresentacion {
  presentacion_id: number;
  presentacion_nombre: string;
  /** Numeric de Postgres: llega como texto para no perder decimales. */
  unidades_por_presentacion_promedio: string | null;
  lotes_considerados: string;
}

/**
 * Stock de insumo con datos de caducidad
 * Si insumo está inactivo, caducidad y nombres llegan nulos
 */
export interface StockInsumo {
  insumo_id: number;
  insumo_nombre: string;
  categoria_nombre?: string;
  unidad_base_nombre?: string;
  stock_total: number;
  proxima_caducidad: string | null;
  semaforo: Semaforo | null;
  insumo_activo: boolean;
  presentaciones: StockPorPresentacion[];
}

/** Fila reducida de stock diseñada para listados, sin desglose de presentaciones */
export interface StockInsumoListado {
  insumo_id: number;
  insumo_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  /**
   * Si la categoría admite préstamo. Sin esto la pantalla ofrecería prestar
   * paracetamol: prestar solo tiene sentido con lo que se devuelve.
   */
  permite_prestamo: boolean;
  unidad_base_nombre: string;
  requiere_fecha_caducidad: boolean;
  requiere_codigo_fabricante: boolean;
  bloquea_solicitud_sin_stock: boolean;
  /** Si cada unidad tiene su propio número de serie y se elige al entregar. */
  serie_por_unidad: boolean;
  stock_total: number;
  proxima_caducidad: string | null;
  semaforo: Semaforo | null;
}

/** Lote individual del semáforo con fechas y nivel de caducidad */
export interface LoteSemaforo {
  detalle_inventario_lote_id: number;
  insumo_id: number;
  insumo_nombre: string;
  /** Código del lote padre de la recepción, no del fabricante. */
  codigo_lote: string | null;
  fecha_caducidad: string | null;
  fecha_recepcion: string;
  cantidad_disponible: number;
  cantidad_inicial: number;
  semaforo: Semaforo;
  /** Código impreso por el fabricante, distinto del código del envío. */
  codigo_lote_fabricante: string | null;
  /** En qué presentación llegó este lote: caja, quintal, unidad. */
  presentacion_nombre: string;
  institucion_nombre: string;
}

/* Cliente */

export const CLAVE_INSUMOS = "insumos";
export const CLAVE_SEMAFORO = "semaforo-inventario";

/**
 * Insumos activos, obtiene límite máximo para desplegables
 * Pensado para catálogos pequeños, se migrará a buscador si crece excesivamente
 */
export async function listarInsumosParaSeleccion(): Promise<Insumo[]> {
  const { data } = await axiosClient.get<Sobre<Insumo>>("insumos", {
    params: { limite: LIMITE_MAXIMO },
  });
  return data.datos;
}

export async function obtenerInsumo(id: number): Promise<Insumo> {
  const { data } = await axiosClient.get<Insumo>("insumos/" + id);
  return data;
}

export async function crearInsumo(datos: DatosInsumo): Promise<Insumo> {
  const { data } = await axiosClient.post<Insumo>("insumos", datos);
  return data;
}

export async function editarInsumo(
  id: number,
  datos: Partial<DatosInsumo>,
): Promise<Insumo> {
  const { data } = await axiosClient.patch<Insumo>("insumos/" + id, datos);
  return data;
}

export async function desactivarInsumo(id: number): Promise<void> {
  await axiosClient.patch("insumos/" + id + "/desactivar");
}

export async function reactivarInsumo(id: number): Promise<void> {
  await axiosClient.patch("insumos/" + id + "/reactivar");
}

/**
 * Stock total (incluye insumos activos con/sin existencias)
 * Permite visualizar el inventario sin múltiples llamadas
 */
export async function listarStockInsumos(filtros?: {
  categoriaId?: number;
  busqueda?: string;
}): Promise<StockInsumoListado[]> {
  const { data } = await axiosClient.get<StockInsumoListado[]>(
    "insumos/stock",
    { params: filtros },
  );
  return data;
}

/**
 * Unidad física individualizada y disponible (ej. por número de serie)
 * Permite entrega controlada (no automática por FEFO)
 */
export interface UnidadDisponible {
  detalle_inventario_lote_id: number;
  insumo_id: number;
  insumo_nombre: string;
  numero_serie: string | null;
  codigo_envio: string | null;
  fecha_recepcion: string;
  institucion_nombre: string;
  marca_nombre: string | null;
  cantidad_disponible: number;
}

/** Vacío si el insumo no lleva número de serie por unidad. */
export async function listarUnidadesDisponibles(
  insumoId: number,
): Promise<UnidadDisponible[]> {
  const { data } = await axiosClient.get<UnidadDisponible[]>(
    "insumos/" + insumoId + "/unidades",
  );
  return data;
}

export async function obtenerStockInsumo(id: number): Promise<StockInsumo> {
  const { data } = await axiosClient.get<StockInsumo>(
    "insumos/" + id + "/stock",
  );
  return data;
}

/* Presentaciones */

export async function listarPresentaciones(
  insumoId: number,
  incluirInactivas = false,
): Promise<PresentacionInsumo[]> {
  const { data } = await axiosClient.get<PresentacionInsumo[]>(
    "insumos/" + insumoId + "/presentaciones",
    { params: incluirInactivas ? { incluirInactivos: "true" } : undefined },
  );
  return data;
}

export async function crearPresentacion(
  insumoId: number,
  datos: {
    unidad_medida_id: number;
    es_default?: boolean;
    unidades_por_presentacion?: number;
  },
): Promise<PresentacionInsumo> {
  const { data } = await axiosClient.post<PresentacionInsumo>(
    "insumos/" + insumoId + "/presentaciones",
    datos,
  );
  return data;
}

export async function editarPresentacion(
  insumoId: number,
  presentacionId: number,
  datos: {
    unidad_medida_id?: number;
    es_default?: boolean;
    unidades_por_presentacion?: number;
  },
): Promise<PresentacionInsumo> {
  const { data } = await axiosClient.patch<PresentacionInsumo>(
    "insumos/" + insumoId + "/presentaciones/" + presentacionId,
    datos,
  );
  return data;
}

export async function desactivarPresentacion(
  insumoId: number,
  presentacionId: number,
): Promise<void> {
  await axiosClient.patch(
    "insumos/" + insumoId + "/presentaciones/" + presentacionId + "/desactivar",
  );
}

export async function reactivarPresentacion(
  insumoId: number,
  presentacionId: number,
): Promise<void> {
  await axiosClient.patch(
    "insumos/" + insumoId + "/presentaciones/" + presentacionId + "/reactivar",
  );
}

/* Semáforo y baja de lote */

/** Recupera todos los lotes activos simultáneamente (sin paginar) */
export async function listarSemaforo(filtros?: {
  insumoId?: number;
  semaforo?: Semaforo;
}): Promise<LoteSemaforo[]> {
  const { data } = await axiosClient.get<LoteSemaforo[]>(
    "inventario/semaforo",
    { params: filtros },
  );
  return data;
}

/**
 * Baja definitiva de lote mediante POST (no PATCH)
 * Ejecuta descarte sin retorno dejando el motivo registrado
 */
export async function darBajaLote(
  loteId: number,
  motivo: string,
): Promise<void> {
  await axiosClient.post("inventario/lotes/" + loteId + "/baja", { motivo });
}
