import { EN_ESPERA_DE_STOCK, listarListaEspera } from "../../api/donaciones";

/**
 * Cuenta líneas de solicitud pendientes por un insumo exacto
 * Usado para medir impacto antes y después de registrar un lote
 */
export async function contarEnEsperaDe(
  insumoNombre: string,
): Promise<number | null> {
  try {
    const lineas = await listarListaEspera(insumoNombre);
    return lineas.filter(
      (linea) =>
        linea.insumo_nombre === insumoNombre &&
        linea.estado === EN_ESPERA_DE_STOCK,
    ).length;
  } catch {
    return null;
  }
}
