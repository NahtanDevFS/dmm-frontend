import axiosClient from "./axiosClient";

/* Datos agregados para las gráficas de Inicio.
   
   No es el módulo de Reportes: no hay filtros ni exportación, y a diferencia
   de /reportes esto sí lo puede pedir EMPLEADO_DMM (mismo rol que ve el
   resto del panel). Ver panel.routes.ts en el backend. */

export interface PuntoEntregasPorMes {
  mes: string; // YYYY-MM-DD, primer día del mes
  total_entregas: number;
}

export interface PuntoStockPorCategoria {
  categoria_nombre: string;
  /* Una fila por categoría y unidad: las cifras de unidades distintas no se
     suman. NULL si la categoría no tiene insumos. Opcional mientras la base no
     tenga la migración 36. */
  unidad_nombre?: string | null;
  unidades_totales_disponibles: number;
  lotes_urgentes_o_vencidos: number;
}

export interface PuntoPoblacionPorPrograma {
  programa_nombre: string;
  personas_unicas_beneficiadas: number;
}

export interface PuntoPoblacionPorGenero {
  genero: string;
  personas_unicas_beneficiadas: number;
}

export async function obtenerEntregasPorMes(
  meses: number,
  signal?: AbortSignal,
): Promise<PuntoEntregasPorMes[]> {
  const { data } = await axiosClient.get<{ datos: PuntoEntregasPorMes[] }>(
    "panel/entregas-por-mes",
    { params: { meses }, signal },
  );
  return data.datos;
}

/* Solicitudes (no líneas) que esperan aprobación de dirección */
export async function obtenerSolicitudesPendientes(
  signal?: AbortSignal,
): Promise<number> {
  const { data } = await axiosClient.get<{ total: number }>(
    "panel/solicitudes-pendientes",
    { signal },
  );
  return data.total;
}

export async function obtenerStockPorCategoria(
  signal?: AbortSignal,
): Promise<PuntoStockPorCategoria[]> {
  const { data } = await axiosClient.get<{ datos: PuntoStockPorCategoria[] }>(
    "panel/stock-por-categoria",
    { signal },
  );
  return data.datos;
}

export async function obtenerPoblacionPorPrograma(
  desde: string,
  hasta: string,
  signal?: AbortSignal,
): Promise<PuntoPoblacionPorPrograma[]> {
  const { data } = await axiosClient.get<{
    datos: PuntoPoblacionPorPrograma[];
  }>("panel/poblacion-por-programa", { params: { desde, hasta }, signal });
  return data.datos;
}

export async function obtenerPoblacionPorGenero(
  desde: string,
  hasta: string,
  signal?: AbortSignal,
): Promise<PuntoPoblacionPorGenero[]> {
  const { data } = await axiosClient.get<{
    datos: PuntoPoblacionPorGenero[];
  }>("panel/poblacion-por-genero", { params: { desde, hasta }, signal });
  return data.datos;
}
