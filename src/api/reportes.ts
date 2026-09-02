import axiosClient from "./axiosClient";

/**
 * Reportes: personas atendidas, stock por categoría, población beneficiada.
 * Único módulo donde ALCALDE tiene acceso — solo lectura, nunca escritura.
 *
 * Cada reporte admite tres formatos vía `?formato=`: json (para mostrar la
 * tabla en pantalla), xlsx y pdf (para descargar). El backend genera el
 * archivo binario directamente — el frontend no arma el Excel ni el PDF, solo
 * pide el formato correcto y ofrece el resultado para guardar.
 */

/* ═══════════════════════════ Tipos del módulo ═══════════════════════════ */

export type FormatoReporte = "json" | "xlsx" | "pdf";

export type Genero = "MASCULINO" | "FEMENINO" | "OTRO" | "PREFIERE_NO_DECIR";

export type GrupoEtario = "MENOR" | "ADULTO" | "ADULTO_MAYOR";

export interface ColumnaReporte {
  campo: string;
  titulo: string;
  ancho: number;
}

/** Lo que devuelve cualquier reporte en formato json. Las filas quedan sin tipar: cada reporte trae columnas propias. */
export interface RespuestaReporte {
  titulo: string;
  generado_en: string;
  filtros: Record<string, unknown>;
  total_registros: number;
  columnas: ColumnaReporte[];
  datos: Record<string, unknown>[];
}

export interface FiltrosPersonasAtendidas {
  desde?: string;
  hasta?: string;
  comunidadId?: number;
  discapacidadId?: number;
  programaId?: number;
  genero?: Genero;
  edadMin?: number;
  edadMax?: number;
  soloAdultoMayor?: boolean;
  soloConDiscapacidad?: boolean;
}

export interface FiltrosStockPorCategoria {
  categoriaId?: number;
  soloConUrgentes?: boolean;
}

export interface FiltrosPoblacionBeneficiada {
  desde?: string;
  hasta?: string;
  comunidadId?: number;
  programaId?: number;
  genero?: Genero;
  grupoEtario?: GrupoEtario;
  soloConDiscapacidad?: boolean;
}

/* ═══════════════════════════ Cliente ═══════════════════════════ */

export const CLAVE_REPORTES = "reportes";

/** Convierte los filtros del frontend a query params, quitando los que están vacíos. */
function aParams(filtros: object): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === "" || valor === false) continue;
    params[clave] = String(valor);
  }
  return params;
}

async function obtenerReporte(
  ruta: string,
  filtros: object,
): Promise<RespuestaReporte> {
  const { data } = await axiosClient.get<RespuestaReporte>(ruta, {
    params: { ...aParams(filtros), formato: "json" },
  });
  return data;
}

/**
 * Descarga un reporte como archivo. axios con responseType "blob" no puede
 * distinguir un archivo real de un error JSON hasta después de recibirlo, así
 * que si el content-type no es el del archivo esperado, se relee el blob como
 * texto y se relanza como un error normal para que mensajeDeError lo entienda.
 */
async function descargarReporte(
  ruta: string,
  filtros: object,
  formato: "xlsx" | "pdf",
  nombreArchivo: string,
): Promise<void> {
  const respuesta = await axiosClient.get(ruta, {
    params: { ...aParams(filtros), formato },
    responseType: "blob",
  });

  const tipo = respuesta.headers["content-type"] as string | undefined;
  if (tipo?.includes("application/json")) {
    const texto = await (respuesta.data as Blob).text();
    const cuerpo: unknown = JSON.parse(texto);
    const mensaje =
      typeof cuerpo === "object" && cuerpo !== null && "message" in cuerpo
        ? String((cuerpo as { message: unknown }).message)
        : "No se pudo generar el reporte.";
    throw new Error(mensaje);
  }

  const url = URL.createObjectURL(respuesta.data as Blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/* ── Personas atendidas ── */

export function obtenerPersonasAtendidas(
  filtros: FiltrosPersonasAtendidas,
): Promise<RespuestaReporte> {
  return obtenerReporte("reportes/personas-atendidas", filtros);
}

export function descargarPersonasAtendidas(
  filtros: FiltrosPersonasAtendidas,
  formato: "xlsx" | "pdf",
): Promise<void> {
  return descargarReporte(
    "reportes/personas-atendidas",
    filtros,
    formato,
    "personas-atendidas." + formato,
  );
}

/* ── Stock por categoría ── */

export function obtenerStockPorCategoria(
  filtros: FiltrosStockPorCategoria,
): Promise<RespuestaReporte> {
  return obtenerReporte("reportes/stock-por-categoria", filtros);
}

export function descargarStockPorCategoria(
  filtros: FiltrosStockPorCategoria,
  formato: "xlsx" | "pdf",
): Promise<void> {
  return descargarReporte(
    "reportes/stock-por-categoria",
    filtros,
    formato,
    "stock-por-categoria." + formato,
  );
}

/* ── Población beneficiada ── */

export function obtenerPoblacionBeneficiada(
  filtros: FiltrosPoblacionBeneficiada,
): Promise<RespuestaReporte> {
  return obtenerReporte("reportes/poblacion-beneficiada", filtros);
}

export function descargarPoblacionBeneficiada(
  filtros: FiltrosPoblacionBeneficiada,
  formato: "xlsx" | "pdf",
): Promise<void> {
  return descargarReporte(
    "reportes/poblacion-beneficiada",
    filtros,
    formato,
    "poblacion-beneficiada." + formato,
  );
}
