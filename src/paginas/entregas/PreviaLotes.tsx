import { useQuery } from "@tanstack/react-query";
import Insignia from "../../componentes/ui/Insignia";
import { formatearFecha } from "../../lib/fechas";
import { CLAVE_ENTREGAS, listarLotesFifo } from "../../api/entregas";
import estilos from "./Entregas.module.css";

/**
 * Vista previa del orden en que la base va a consumir los lotes de un insumo
 * (FEFO con respaldo FIFO).
 *
 * Es solo lectura y orientativa: sp_agregar_insumo_entrega decide de verdad
 * al registrar, con el stock real de ese momento. Si algo cambió entre la
 * previsualización y el envío, la base manda.
 *
 * Vive aparte porque los dos caminos hacia una entrega la necesitan igual, y
 * tenerla duplicada garantizaba que un arreglo se aplicara solo en uno.
 */
function PreviaLotes({
  insumoId,
  cantidadPedida,
}: {
  insumoId: number;
  /**
   * Lo que se pretende entregar, para avisar antes de enviar si no alcanza.
   * En el despacho de una línea el tope ya lo impone la línea, así que ahí
   * puede omitirse.
   */
  cantidadPedida?: number;
}) {
  const fifo = useQuery({
    queryKey: [CLAVE_ENTREGAS, "lotes-fifo", insumoId],
    queryFn: () => listarLotesFifo(insumoId),
  });

  const disponible = (fifo.data ?? []).reduce(
    (suma, lote) => suma + lote.cantidad_disponible,
    0,
  );

  // Solo cuando hay un número que comparar y los lotes ya llegaron: avisar
  // "no alcanza" mientras la consulta viaja sería un susto falso.
  const noAlcanza =
    fifo.data !== undefined &&
    cantidadPedida !== undefined &&
    cantidadPedida > 0 &&
    cantidadPedida > disponible;

  return (
    <div className={estilos.previaFifo}>
      <p className={estilos.nota}>
        <strong>Vista previa del orden de despacho.</strong> La base decide con
        el stock real al momento de registrar; esto es orientativo.
      </p>

      {fifo.isPending ? (
        <p className={estilos.auxiliar}>Consultando lotes disponibles…</p>
      ) : fifo.isError ? (
        <p className={estilos.auxiliar}>
          No se pudo consultar la vista previa. Puede continuar: la base valida
          el stock al registrar.
        </p>
      ) : fifo.data.length === 0 ? (
        <Insignia tono="rechazada">Sin lotes disponibles</Insignia>
      ) : (
        <>
          <div className={estilos.listaLotes}>
            {fifo.data.map((lote) => (
              <div
                key={lote.detalle_inventario_lote_id}
                className={estilos.lote}
              >
                <span className={estilos.loteCodigo}>
                  {lote.codigo_lote ?? "Sin código"}
                </span>
                <span className={estilos.auxiliar}>
                  {lote.fecha_caducidad
                    ? "Caduca " + formatearFecha(lote.fecha_caducidad)
                    : "Sin caducidad"}
                  {" · "}
                  {lote.cantidad_disponible.toLocaleString("es-GT")} disponibles
                </span>
              </div>
            ))}
          </div>

          {noAlcanza && (
            <Insignia tono="rechazada">
              Está pidiendo más de lo que hay en existencia. La base rechazará
              la entrega.
            </Insignia>
          )}
        </>
      )}
    </div>
  );
}

export default PreviaLotes;
