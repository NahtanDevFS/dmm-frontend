import axiosClient from "./axiosClient";

/**
 * Préstamos de equipo: contratos que nacen de un renglón de entrega ya
 * registrado (detalle_entrega_id), no de un formulario aparte — el alta
 * vive en la ficha de la entrega (ModalFichaEntrega → «Registrar préstamo»),
 * porque un contrato siempre necesita esa entrega física real, no un dato
 * que alguien recuerde de memoria.
 *
 * La renovación es una cadena LINEAL: renovar un contrato crea uno nuevo
 * encadenado (contrato_anterior_id) y deja al anterior en EXTENDIDO. Solo
 * el último contrato de la cadena admite renovarse o registrar la
 * devolución; el backend lo valida y aquí solo se refleja su mensaje.
 *
 * "Vencido" se calcula por fechas, no por estado_id: nada en la base mueve
 * el estado solo. marcarVencidos() es la acción explícita de Dirección que
 * lo hace, y no ocurre sola.
 */

/* ═══════════════════════════ Tipos del módulo ═══════════════════════════ */

export const ESTADO_CONTRATO = {
  VIGENTE: "VIGENTE",
  DEVUELTO: "DEVUELTO",
  VENCIDO: "VENCIDO",
  EXTENDIDO: "EXTENDIDO",
  /**
   * El equipo no volvió: se perdió, no lo trajeron, se dio por incobrable.
   * El contrato se cierra pero el stock NO se restituye, porque el equipo
   * efectivamente no está. Distinto de anular, que deshace el registro
   * entero y sí devuelve el equipo al inventario.
   */
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

/**
 * Evidencias del contrato: el documento firmado (tipo CONTRATO_FIRMADO), el
 * DPI de quien firma (frontal/reverso), y la foto de recepción del equipo
 * -- todo vive aquí, no hay una columna dedicada solo para el contrato
 * firmado. Un préstamo no exige formularios de estudio socioeconómico —
 * eso es solo para donación definitiva.
 */
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
  /**
   * Resueltos desde el contrato raíz de la cadena. Ausentes (undefined) en
   * el caso raro de una cadena sin entrega física resoluble.
   */
  persona_id?: number;
  persona_nombre_completo?: string;
  insumo_nombre?: string;
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

/* ═══════════════════════════ Cliente ═══════════════════════════ */

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
 * Registra un préstamo completo: entrega el equipo y crea su contrato.
 *
 * Es la puerta principal del módulo. El préstamo no pasa por solicitud —eso
 * es para decidir donaciones, con estudio y aprobación— así que aquí se
 * resuelve todo: quién se lleva qué y hasta cuándo. Las fotos del contrato
 * firmado y del DPI se adjuntan después, sobre el contrato ya creado.
 *
 * La entrega queda registrada y aparece en Entregas, porque el equipo salió
 * de verdad y el inventario se descontó.
 */
export async function crearPrestamoDirecto(datos: {
  persona_id: number;
  insumo_id: number;
  fecha_devolucion_pactada: string;
  observaciones?: string | null;
}): Promise<Contrato & { entrega_id: number }> {
  const { data } = await axiosClient.post<Contrato & { entrega_id: number }>(
    "contratos/directo",
    datos,
  );
  return data;
}

/**
 * Crea el contrato inicial de un renglón de entrega. Se llama desde la
 * ficha de la entrega, nunca desde un formulario que pida el id a mano.
 */
export async function crearContrato(
  datos: DatosCrearContrato,
): Promise<Contrato> {
  const { data } = await axiosClient.post<Contrato>("contratos", datos);
  return data;
}

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

/** Registra la devolución; el backend resuelve solo el contrato raíz de la cadena si aplica. */
export async function registrarDevolucion(
  id: number,
): Promise<ContratoDetalle> {
  const { data } = await axiosClient.post<ContratoDetalle>(
    "contratos/" + id + "/devolucion",
  );
  return data;
}

/**
 * Anula un préstamo registrado por error: deshace el contrato Y la entrega, y
 * el equipo vuelve al inventario.
 *
 * Es para "me equivoqué al capturar". El backend lo rechaza si el préstamo ya
 * tuvo devolución o multas pagadas, porque entonces no fue un error de
 * registro sino algo que sí ocurrió.
 */
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

/**
 * Cierra un préstamo cuyo equipo no volvió. El stock NO se restituye: decir
 * que la silla está disponible cuando nadie la tiene sería mentir sobre el
 * inventario.
 */
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

/* ── Multas ── */

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

/* ── Evidencias del contrato (DPI, principalmente) ── */

export async function listarEvidenciasContrato(
  contratoId: number,
): Promise<EvidenciaContrato[]> {
  const { data } = await axiosClient.get<EvidenciaContrato[]>(
    "contratos/" + contratoId + "/evidencias",
  );
  return data;
}

/**
 * Sube una evidencia del contrato. Va como multipart y el archivo viaja en
 * el campo `archivo`, el nombre que espera el middleware del backend.
 */
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
