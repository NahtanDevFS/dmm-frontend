import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, { CeldaAcciones, CeldaCantidad } from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  crearPresentacion,
  desactivarPresentacion,
  editarPresentacion,
  listarPresentaciones,
  reactivarPresentacion,
  type StockPorPresentacion,
} from "../../api/inventario";
import type { ElementoCatalogo } from "../../types/api";
import estilos from "./Inventario.module.css";

/**
 * Presentaciones en las que se recibe un insumo.
 *
 * Una presentación es la forma en que llega la donación —caja de 100, bolsa de
 * 5 libras—, no la unidad en la que se cuentan las existencias. Esa distinción
 * es la razón de que el módulo tenga dos unidades de medida por insumo: la
 * base, en la que vive el stock, y la de cada presentación, que solo describe
 * el envase de entrada.
 *
 * Exactamente una presentación es la predeterminada, y lo garantiza un índice
 * único parcial de la base (insumo_id donde es_default), no esta pantalla. Por
 * eso no hay forma de «desmarcar» la predeterminada: se marca otra, y la base
 * desplaza a la anterior en la misma transacción.
 */
function SeccionPresentaciones({
  insumoId,
  puedeGestionar,
  stock,
}: {
  insumoId: number;
  puedeGestionar: boolean;
  /** Existencias por presentación, para no repetir la consulta de stock. */
  stock: StockPorPresentacion[];
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();
  const [nuevaUnidad, setNuevaUnidad] = useState("");

  const unidades = useCatalogo<ElementoCatalogo>("unidades-medida", {
    incluirInactivos: true,
  });

  const consulta = useQuery({
    queryKey: [CLAVE_INSUMOS, insumoId, "presentaciones"],
    // Con inactivas: una presentación dada de baja sigue explicando de dónde
    // salieron los lotes que se recibieron en ella.
    queryFn: () => listarPresentaciones(insumoId, true),
  });

  const refrescar = () =>
    clienteQuery.invalidateQueries({ queryKey: [CLAVE_INSUMOS, insumoId] });

  const alta = useMutation({
    mutationFn: () =>
      crearPresentacion(insumoId, {
        unidad_medida_id: Number(nuevaUnidad),
      }),
    onSuccess: async () => {
      await refrescar();
      setNuevaUnidad("");
      avisar("Presentación agregada.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const marcarDefault = useMutation({
    mutationFn: (presentacionId: number) =>
      editarPresentacion(insumoId, presentacionId, { es_default: true }),
    onSuccess: async () => {
      await refrescar();
      avisar("Presentación predeterminada actualizada.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cambioEstado = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      activar
        ? reactivarPresentacion(insumoId, id)
        : desactivarPresentacion(insumoId, id),
    onSuccess: async (_datos, { activar }) => {
      await refrescar();
      avisar(
        activar ? "Presentación reactivada." : "Presentación desactivada.",
        "exito",
      );
    },
    /*
      El 409 explica cuál de las dos reglas se interpuso: quedan lotes activos
      recibidos en esta presentación, o es la predeterminada y hay otras
      activas. Se muestra el mensaje del servidor porque dice cuál de las dos.
    */
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const presentaciones = consulta.data ?? [];

  /** Unidades que todavía no tiene el insumo: la unicidad es por (insumo, unidad). */
  const disponibles = unidades.opciones.filter(
    (unidad) =>
      unidad.activo &&
      !presentaciones.some((p) => p.unidad_medida_id === unidad.id),
  );

  const nombreUnidad = (id: number) =>
    unidades.opciones.find((unidad) => unidad.id === id)?.nombre ?? "—";

  const stockDe = (presentacionId: number) =>
    stock.find((fila) => fila.presentacion_id === presentacionId);

  return (
    <section className={estilos.tarjeta} aria-labelledby="inv-presentaciones">
      <div className={estilos.tituloTarjeta}>
        <h2 id="inv-presentaciones">Presentaciones</h2>
      </div>

      <p className={estilos.nota}>
        La forma en que llega la donación. La predeterminada es la que se
        propone al registrar un lote y al despachar una entrega; solo puede
        haber una, y para cambiarla se marca otra.
      </p>

      {consulta.isPending ? (
        <EsqueletoTabla filas={2} columnas={4} />
      ) : consulta.isError ? (
        <EstadoVacio
          titulo="No se pudieron cargar las presentaciones"
          texto={mensajeDeError(consulta.error)}
        />
      ) : presentaciones.length === 0 ? (
        <EstadoVacio
          titulo="Sin presentaciones"
          texto={
            puedeGestionar
              ? "Agregue la primera con el formulario de abajo. Se marcará como predeterminada automáticamente."
              : "Este insumo todavía no puede recibirse: no tiene ninguna presentación registrada."
          }
        />
      ) : (
        <Tabla titulo="Presentaciones del insumo">
          <thead>
            <tr>
              <th>Unidad de la presentación</th>
              <th>Unidades por presentación</th>
              <th>Estado</th>
              {puedeGestionar && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {presentaciones.map((presentacion) => {
              const existencias = stockDe(presentacion.id);
              return (
                <tr key={presentacion.id}>
                  <td>
                    <span className={estilos.nombre}>
                      {nombreUnidad(presentacion.unidad_medida_id)}
                    </span>{" "}
                    {presentacion.es_default && (
                      <Insignia tono="marca">Predeterminada</Insignia>
                    )}
                  </td>
                  <CeldaCantidad>
                    {existencias?.unidades_por_presentacion_promedio ?? "—"}
                    {existencias && (
                      <>
                        {" "}
                        <span className={estilos.banderaAyuda}>
                          (promedio de {existencias.lotes_considerados} lotes)
                        </span>
                      </>
                    )}
                  </CeldaCantidad>
                  <td>
                    {presentacion.activo ? (
                      <Insignia tono="aprobada">Activa</Insignia>
                    ) : (
                      <Insignia tono="neutra">Inactiva</Insignia>
                    )}
                  </td>
                  {puedeGestionar && (
                    <CeldaAcciones>
                      <span className={estilos.acciones}>
                        {presentacion.activo && !presentacion.es_default && (
                          <Boton
                            pequeno
                            variante="secundaria"
                            onClick={() => marcarDefault.mutate(presentacion.id)}
                          >
                            Marcar predeterminada
                          </Boton>
                        )}
                        {presentacion.activo ? (
                          <Boton
                            pequeno
                            variante="terciaria"
                            onClick={async () => {
                              const ok = await confirmar({
                                titulo: "Desactivar presentación",
                                mensaje:
                                  "Dejará de ofrecerse al registrar lotes de este insumo. Los lotes ya recibidos en ella se conservan.",
                                textoConfirmar: "Desactivar",
                                destructiva: true,
                              });
                              if (ok) {
                                cambioEstado.mutate({
                                  id: presentacion.id,
                                  activar: false,
                                });
                              }
                            }}
                          >
                            Desactivar
                          </Boton>
                        ) : (
                          <Boton
                            pequeno
                            variante="secundaria"
                            onClick={() =>
                              cambioEstado.mutate({
                                id: presentacion.id,
                                activar: true,
                              })
                            }
                          >
                            Reactivar
                          </Boton>
                        )}
                      </span>
                    </CeldaAcciones>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Tabla>
      )}

      {puedeGestionar && (
        <div className={estilos.formularioEnLinea}>
          <CampoSelect
            etiqueta="Nueva presentación"
            marcador="Elija la unidad de la presentación"
            value={nuevaUnidad}
            onChange={(e) => setNuevaUnidad(e.target.value)}
            ayuda={
              presentaciones.length === 0
                ? "La primera presentación queda como predeterminada."
                : "Solo se ofrecen las unidades que este insumo aún no tiene."
            }
          >
            {disponibles.map((unidad) => (
              <option key={unidad.id} value={unidad.id}>
                {unidad.nombre}
              </option>
            ))}
          </CampoSelect>
          <Boton
            variante="secundaria"
            disabled={!nuevaUnidad}
            cargando={alta.isPending}
            onClick={() => alta.mutate()}
          >
            Agregar presentación
          </Boton>
        </div>
      )}
    </section>
  );
}

export default SeccionPresentaciones;
