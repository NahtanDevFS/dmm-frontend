import { EN_ESPERA_DE_STOCK, listarListaEspera } from "../../api/donaciones";

/**
 * Cuántas líneas de solicitud están esperando existencias de un insumo.
 *
 * Sirve para medir el efecto de registrar un lote: sp_procesar_donacion_
 * pendientes se ejecuta dentro de la misma transacción que crea el lote, pero
 * la respuesta del POST no dice a cuántas líneas destrabó. Contando antes y
 * después se obtiene el dato sin tocar el backend.
 *
 * El filtro del servidor es un ILIKE sobre el nombre, así que «Jabón» trae
 * también «Jabón líquido»; por eso se afina aquí por nombre exacto. Y se
 * cuentan solo las PENDIENTE_ADQUISICION: la vista incluye además las
 * PENDIENTE_ENTREGA_PARCIAL, que ya tienen stock asignado y no son las que el
 * procedimiento promueve.
 *
 * Nunca lanza. Es información complementaria a la operación real —el lote ya
 * quedó registrado— y un fallo aquí no puede convertirse en un error que haga
 * dudar de si la donación entró.
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
