import axiosClient from "./axiosClient";
import type { Semaforo } from "../types/api";

/**
 * Inventario: insumos, sus presentaciones y el semáforo de caducidad.
 *
 * El módulo mezcla dos niveles de autorización que conviene no confundir al
 * leer el código: consultar es de OPERACION —cualquiera que trabaje a diario
 * necesita saber qué hay en bodega—, pero crear y editar un insumo es de
 * DIRECCION, porque el insumo es dato maestro del catálogo y no operación.
 * La baja de un lote vuelve a ser de OPERACION: es un hecho de bodega.
 */

/* ═══════════════════════════ Tipos del módulo ═══════════════════════════ */

/**
 * Insumo tal como lo devuelve el API. Espejo de SELECT_PUBLICO en
 * dmm-backend/src/modules/insumos/insumo.repository.ts.
 *
 * Las tres banderas viven en el insumo y no en su categoría. Lo fueron en el
 * esquema original y se movieron: dentro de «Medicamentos» conviven productos
 * que caducan y productos que no, así que heredarlas de la categoría obligaba
 * a fabricar categorías artificiales para cada combinación. Quien las lee es
 * la base —fn_calcular_recepcion_lote exige la caducidad y el código de
 * fabricante al registrar un lote, y fn_validar_stock_linea_solicitud bloquea
 * la línea sin existencias—, no la interfaz.
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
  bloquea_solicitud_sin_stock?: boolean;
}

/**
 * Presentación en la que se recibe un insumo: caja, bolsa, quintal. El API
 * devuelve solo el id de la unidad de medida, no su nombre, así que la
 * pantalla lo resuelve contra el catálogo de unidades.
 */
export interface PresentacionInsumo {
  id: number;
  insumo_id: number;
  unidad_medida_id: number;
  es_default: boolean;
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
 * Respuesta de GET /insumos/:id/stock.
 *
 * Un insumo desactivado queda fuera de v_stock_insumo aunque conserve
 * existencias, y entonces el backend devuelve la forma reducida: el total sí,
 * pero sin datos de caducidad ni nombres de catálogo. Por eso esos campos son
 * opcionales aquí y `insumo_activo` es lo que distingue un caso del otro.
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

/**
 * Un renglón del semáforo: un lote concreto de un insumo, no el insumo. El
 * mismo insumo aparece tantas veces como lotes activos tenga, que es
 * justamente lo que hace útil la vista: lo que vence es el lote.
 */
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
}

/* ═══════════════════════════ Cliente ═══════════════════════════ */

export const CLAVE_INSUMOS = "insumos";
export const CLAVE_SEMAFORO = "semaforo-inventario";

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

export async function obtenerStockInsumo(id: number): Promise<StockInsumo> {
  const { data } = await axiosClient.get<StockInsumo>(
    "insumos/" + id + "/stock",
  );
  return data;
}

/* ── Presentaciones ── */

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
  datos: { unidad_medida_id: number; es_default?: boolean },
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
  datos: { unidad_medida_id?: number; es_default?: boolean },
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

/* ── Semáforo y baja de lote ── */

/**
 * GET /inventario/semaforo. No pagina ni devuelve conteo: entrega todos los
 * lotes activos de una vez. Se acepta así porque el inventario de la DMM se
 * mide en cientos de lotes, no en miles, y porque el resumen por color hay que
 * contarlo sobre el conjunto completo de todas formas.
 */
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
 * Baja de un lote por vencimiento o daño. Es POST y no PATCH porque no edita
 * el lote: descarta las existencias con sp_dar_baja_insumo_vencido y deja el
 * motivo escrito en las observaciones. No hay vuelta atrás.
 */
export async function darBajaLote(
  loteId: number,
  motivo: string,
): Promise<void> {
  await axiosClient.post("inventario/lotes/" + loteId + "/baja", { motivo });
}
