import axiosClient from "./axiosClient";

/**
 * Préstamos de equipo: contratos vinculados a entregas físicas (detalle_entrega_id)
 * Las renovaciones forman cadenas lineales donde solo el último es modificable
 */

/* Tipos del módulo */

export const ESTADO_CONTRATO = {
  VIGENTE: "VIGENTE",
  DEVUELTO: "DEVUELTO",
  VENCIDO: "VENCIDO",
  EXTENDIDO: "EXTENDIDO",
  /** Contrato cerrado sin restituir inventario (equipo perdido/incobrable) */
  NO_DEVUELTO: "NO_DEVUELTO",
} as const;

export type EstadoContrato =
  (typeof ESTADO_CONTRATO)[keyof typeof ESTADO_CONTRATO];

export interface Contrato {
  id: number;
  detalle_entrega_id: number | null;
  contrato_anterior_id: number | null;
  fecha_inicio: string;
  fecha_devolucion_pactada: string;
  fecha_devolucion_real: string | null;
  estado_id: number;
  /**
   * Por qué se anuló el contrato o por qué se dio el equipo por no devuelto.
   * Vacío mientras el préstamo sigue su curso normal.
   */
  motivo_cierre: string | null;
  activo: boolean;
}

/** Fila del listado: persona e insumo ya resueltos, subiendo por la cadena hasta la raíz. */
export interface ContratoListado {
  id: number;
  contrato_anterior_id: number | null;
  detalle_entrega_origen_id: number | null;
  fecha_inicio: string;
  fecha_devolucion_pactada: string;
  fecha_devolucion_real: string | null;
  estado: EstadoContrato;
  activo: boolean;
  persona_id: number | null;
  persona_nombre_completo: string | null;
  insumo_nombre: string | null;
  cantidad_entregada: number | null;
  dias_de_retraso: number;
  multas_pendientes: number;
  monto_pendiente: string;
}

export interface ContratoVencido {
  id: number;
  fecha_inicio: string;
  fecha_devolucion_pactada: string;
  dias_de_retraso: number;
  estado: EstadoContrato;
  persona_id: number | null;
  persona_nombre_completo: string | null;
  insumo_nombre: string | null;
  cantidad_entregada: number | null;
  multas_pendientes: number;
}

export interface Multa {
  id: number;
  contrato_prestamo_id: number;
  tipo_multa_id: number;
  tipo_multa_nombre: string;
  monto: string;
  fecha_aplicacion: string;
  motivo: string | null;
  pagada: boolean;
  fecha_pago: string | null;
  activo: boolean;
}

/** Evidencias centralizadas (contrato firmado, DPI, fotos) sin requerir estudio socioeconómico */
export interface EvidenciaContrato {
  id: number;
  contrato_prestamo_id: number;
  tipo_evidencia_id: number;
  ruta_archivo: string;
  observaciones: string | null;
  activo: boolean;
}

/** Lo que devuelve GET /contratos/:id: la cabecera con sus sub-recursos. */
export interface ContratoDetalle extends Contrato {
  multas: Multa[];
  /** La cadena completa de renovaciones a la que pertenece, en orden. */
  cadena: Contrato[];
  /** El DPI de quien firma, frontal/reverso, y cualquier otra evidencia. */
  evidencias: EvidenciaContrato[];
  /** Resueltos desde el contrato raíz (undefined si no hay entrega física resoluble) */
  persona_id?: number;
  persona_nombre_completo?: string;
  insumo_nombre?: string;
  /** Serie del equipo (permite verificar que la devolución es correcta) */
  numero_serie?: string | null;
  cantidad_entregada?: number;
}

export interface DatosCrearContrato {
  detalle_entrega_id: number;
  fecha_devolucion_pactada: string;
  fecha_inicio?: string;
}

export interface DatosAplicarMulta {
  tipo_multa_id: number;
  /** Si se omite, el backend usa el monto_sugerido del tipo de multa. */
  monto?: number;
  motivo?: string | null;
  fecha_aplicacion?: string;
}

export interface FiltrosContratos {
  estado?: EstadoContrato;
  personaId?: number;
  incluirInactivos?: boolean;
}

/* Cliente */

export const CLAVE_CONTRATOS = "contratos";

export async function obtenerContrato(id: number): Promise<ContratoDetalle> {
  const { data } = await axiosClient.get<ContratoDetalle>("contratos/" + id);
  return data;
}

export async function listarContratosVencidos(): Promise<ContratoVencido[]> {
  const { data } =
    await axiosClient.get<ContratoVencido[]>("contratos/vencidos");
  return data;
}

/** Solo DIRECCION: pone en VENCIDO los contratos con fecha pactada ya pasada. */
export async function marcarVencidos(): Promise<{
  actualizados: number;
  /** Multas por atraso aplicadas automáticamente en la misma pasada. */
  multas: number;
  message: string;
}> {
  const { data } = await axiosClient.post<{
    actualizados: number;
    multas: number;
    message: string;
  }>("contratos/marcar-vencidos");
  return data;
}

/**
 * Alta completa de préstamo (entrega y contrato)
 * No requiere solicitud previa, las fotos y DPI se adjuntan en el siguiente paso
 */
export async function crearPrestamoDirecto(datos: {
  persona_id: number;
  insumo_id: number;
  fecha_devolucion_pactada: string;
  observaciones?: string | null;
  /** Identificador de serie, evita selección automática por FEFO en equipos enumerables */
  detalle_inventario_lote_id?: number | null;
}): Promise<Contrato & { entrega_id: number }> {
  const { data } = await axiosClient.post<Contrato & { entrega_id: number }>(
    "contratos/directo",
    datos,
  );
  return data;
}

/** Crea el contrato inicial desde la ficha de entrega */
export async function crearContrato(
  datos: DatosCrearContrato,
): Promise<Contrato> {
  const { data } = await axiosClient.post<Contrato>("contratos", datos);
  return data;
}

/** Renueva un préstamo extendiendo su fecha de devolución */
export async function renovarContrato(
  id: number,
  fechaDevolucionPactada: string,
): Promise<Contrato> {
  const { data } = await axiosClient.post<Contrato>(
    "contratos/" + id + "/renovar",
    { fecha_devolucion_pactada: fechaDevolucionPactada },
  );
  return data;
}

export async function editarContrato(
  id: number,
  fechaDevolucionPactada: string,
): Promise<Contrato> {
  const { data } = await axiosClient.patch<Contrato>("contratos/" + id, {
    fecha_devolucion_pactada: fechaDevolucionPactada,
  });
  return data;
}

/** Registra la devolución (backend resuelve el contrato raíz) */
export async function registrarDevolucion(
  id: number,
): Promise<ContratoDetalle> {
  const { data } = await axiosClient.post<ContratoDetalle>(
    "contratos/" + id + "/devolucion",
  );
  return data;
}

/** Anula contrato y entrega por error de captura (rechaza si hay multas) */
export async function anularContrato(
  id: number,
  motivo: string,
): Promise<Contrato> {
  const { data } = await axiosClient.post<Contrato>(
    "contratos/" + id + "/anular",
    { motivo },
  );
  return data;
}

/** Cierra un préstamo por no devolución (stock no se restituye) */
export async function marcarNoDevuelto(
  id: number,
  motivo: string,
): Promise<Contrato> {
  const { data } = await axiosClient.post<Contrato>(
    "contratos/" + id + "/no-devuelto",
    { motivo },
  );
  return data;
}

/* Multas */

export async function listarMultas(
  contratoId: number,
  incluirAnuladas = false,
): Promise<Multa[]> {
  const { data } = await axiosClient.get<Multa[]>(
    "contratos/" + contratoId + "/multas",
    { params: incluirAnuladas ? { incluirAnuladas: "true" } : undefined },
  );
  return data;
}

export async function aplicarMulta(
  contratoId: number,
  datos: DatosAplicarMulta,
): Promise<Multa> {
  const { data } = await axiosClient.post<Multa>(
    "contratos/" + contratoId + "/multas",
    datos,
  );
  return data;
}

export async function editarMulta(
  contratoId: number,
  multaId: number,
  datos: { monto?: number; motivo?: string | null },
): Promise<Multa> {
  const { data } = await axiosClient.patch<Multa>(
    "contratos/" + contratoId + "/multas/" + multaId,
    datos,
  );
  return data;
}

export async function pagarMulta(
  contratoId: number,
  multaId: number,
  fechaPago?: string,
): Promise<Multa> {
  const { data } = await axiosClient.post<Multa>(
    "contratos/" + contratoId + "/multas/" + multaId + "/pagar",
    fechaPago ? { fecha_pago: fechaPago } : undefined,
  );
  return data;
}

export async function anularMulta(
  contratoId: number,
  multaId: number,
): Promise<Multa> {
  const { data } = await axiosClient.post<Multa>(
    "contratos/" + contratoId + "/multas/" + multaId + "/anular",
  );
  return data;
}

/* Evidencias del contrato */

export async function listarEvidenciasContrato(
  contratoId: number,
): Promise<EvidenciaContrato[]> {
  const { data } = await axiosClient.get<EvidenciaContrato[]>(
    "contratos/" + contratoId + "/evidencias",
  );
  return data;
}

/** Sube evidencia como multipart (`archivo`) */
export async function subirEvidenciaContrato(
  contratoId: number,
  datos: { archivo: File; tipoEvidenciaId: number; observaciones?: string },
): Promise<EvidenciaContrato> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", datos.archivo);
  cuerpo.append("tipo_evidencia_id", String(datos.tipoEvidenciaId));
  if (datos.observaciones) cuerpo.append("observaciones", datos.observaciones);

  const { data } = await axiosClient.post<EvidenciaContrato>(
    "contratos/" + contratoId + "/evidencias",
    cuerpo,
  );
  return data;
}

/** Elimina (baja lógica) y devuelve la lista de evidencias ya actualizada. */
export async function eliminarEvidenciaContrato(
  contratoId: number,
  evidenciaId: number,
): Promise<EvidenciaContrato[]> {
  const { data } = await axiosClient.delete<EvidenciaContrato[]>(
    "contratos/" + contratoId + "/evidencias/" + evidenciaId,
  );
  return data;
}
