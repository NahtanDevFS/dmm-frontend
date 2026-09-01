import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import { EstadoVacio } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { mensajeDeError } from "../../lib/errores";
import { tonoDeEstadoSolicitud } from "../../componentes/ui/tonos";
import {
  CLAVE_INSUMOS,
  listarInsumosParaSeleccion,
} from "../../api/inventario";
import {
  CLAVE_SOLICITUDES,
  agregarLinea,
  cancelarLinea,
  type LineaSolicitud,
} from "../../api/solicitudes";
import ModalDespacho from "../entregas/ModalDespacho";
import ModalFormulariosLinea from "../formularios/ModalFormulariosLinea";
import estilos from "./Solicitudes.module.css";

/** Estados en los que una línea todavía admite cancelarse desde aquí. */
const ESTADOS_CANCELABLES = new Set([
  "PENDIENTE_ADQUISICION",
  "PENDIENTE_ENTREGA",
  "PENDIENTE_ENTREGA_PARCIAL",
]);

/** Estados en los que ya hay algo que despachar: la base ya asignó stock. */
const ESTADOS_DESPACHABLES = new Set([
  "PENDIENTE_ENTREGA",
  "PENDIENTE_ENTREGA_PARCIAL",
]);

function SeccionLineasSolicitud({
  solicitudId,
  personaId,
  lineas,
  solicitudActiva,
  onBorrador,
}: {
  solicitudId: number;
  /** Necesaria para el despacho: la entrega se registra a nombre de esta persona. */
  personaId: number;
  lineas: LineaSolicitud[];
  /** Una solicitud cancelada o inactiva no admite líneas nuevas. */
  solicitudActiva: boolean;
  onBorrador?: (hay: boolean) => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [despachando, setDespachando] = useState<LineaSolicitud | null>(null);
  const [verFormularios, setVerFormularios] = useState<LineaSolicitud | null>(
    null,
  );

  // El catálogo de estados es {id, nombre}: aquí solo hace falta el nombre
  // para reutilizar el mismo tono e insignia que ya usa el listado.
  const estados = useCatalogo<{ id: number; nombre: string }>(
    "estados-solicitud",
  );
  const insumos = useQuery({
    queryKey: [CLAVE_INSUMOS, "seleccion"],
    queryFn: listarInsumosParaSeleccion,
  });

  const nombreEstado = (estadoId: number) =>
    estados.opciones.find((e) => e.id === estadoId)?.nombre ?? "—";

  const refrescar = () =>
    clienteQuery.invalidateQueries({
      queryKey: [CLAVE_SOLICITUDES, solicitudId],
    });

  const cambiar = (siguienteInsumo: string, siguienteCantidad: string) => {
    setInsumoId(siguienteInsumo);
    setCantidad(siguienteCantidad);
    onBorrador?.(siguienteInsumo !== "" || siguienteCantidad !== "");
  };

  const alta = useMutation({
    mutationFn: () =>
      agregarLinea(solicitudId, {
        insumo_id: Number(insumoId),
        cantidad_requerida: Number(cantidad),
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Insumo agregado a la solicitud.", "exito");
      cambiar("", "");
    },
    // Incluye el rechazo por falta de stock del insumo (fn_validar_stock):
    // el backend ya redacta el mensaje en español con qué hacer.
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cancelacion = useMutation({
    mutationFn: (lineaId: number) => cancelarLinea(solicitudId, lineaId),
    onSuccess: async () => {
      await refrescar();
      avisar("Línea cancelada.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const listaParaAgregar =
    insumoId !== "" &&
    Number.isInteger(Number(cantidad)) &&
    Number(cantidad) > 0;

  return (
    <section className={estilos.tarjeta} aria-labelledby="sol-lineas">
      <div className={estilos.tituloTarjeta}>
        <h2 id="sol-lineas">Insumos solicitados</h2>
      </div>

      {lineas.length === 0 ? (
        <EstadoVacio
          titulo="Sin insumos"
          texto="Agregue el primer insumo con el formulario de abajo."
        />
      ) : (
        <Tabla titulo="Líneas de la solicitud">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea) => {
              const nombre = nombreEstado(linea.estado_id);
              const cancelable =
                linea.activo && ESTADOS_CANCELABLES.has(nombre);
              return (
                <tr key={linea.id}>
                  {/* El id del insumo no viene resuelto en este sub-recurso;
                      lo busca la lista de insumos, ya cargada para el alta. */}
                  <td>
                    {insumos.data?.find((i) => i.id === linea.insumo_id)
                      ?.nombre ?? "Insumo #" + linea.insumo_id}
                  </td>
                  <CeldaCantidad>
                    {linea.cantidad_entregada} / {linea.cantidad_requerida}
                  </CeldaCantidad>
                  <td>
                    <Insignia tono={tonoDeEstadoSolicitud(nombre)}>
                      {nombre}
                    </Insignia>
                    {!linea.activo && (
                      <Insignia tono="neutra">Inactiva</Insignia>
                    )}
                  </td>
                  <CeldaAcciones>
                    {ESTADOS_DESPACHABLES.has(nombre) && linea.activo && (
                      <Boton
                        pequeno
                        variante="secundaria"
                        onClick={() => setDespachando(linea)}
                      >
                        Despachar
                      </Boton>
                    )}
                    <Boton
                      pequeno
                      variante="secundaria"
                      onClick={() => setVerFormularios(linea)}
                    >
                      Formularios
                    </Boton>
                    {cancelable && (
                      <Boton
                        pequeno
                        variante="terciaria"
                        cargando={
                          cancelacion.isPending &&
                          cancelacion.variables === linea.id
                        }
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: "Cancelar línea",
                            mensaje:
                              "Se cancelará esta línea de la solicitud. No se puede deshacer desde aquí.",
                            textoConfirmar: "Cancelar línea",
                            destructiva: true,
                          });
                          if (ok) cancelacion.mutate(linea.id);
                        }}
                      >
                        Cancelar
                      </Boton>
                    )}
                  </CeldaAcciones>
                </tr>
              );
            })}
          </tbody>
        </Tabla>
      )}

      {solicitudActiva && (
        <div className={estilos.formularioLote}>
          <div className={estilos.rejillaLote}>
            <CampoSelect
              etiqueta="Insumo"
              value={insumoId}
              onChange={(e) => cambiar(e.target.value, cantidad)}
            >
              {insumos.data?.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoTexto
              etiqueta="Cantidad requerida"
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => cambiar(insumoId, e.target.value)}
            />
          </div>

          <div className={estilos.accionLote}>
            <Boton
              variante="secundaria"
              disabled={!listaParaAgregar}
              cargando={alta.isPending}
              textoCargando="Agregando…"
              onClick={() => alta.mutate()}
            >
              + Agregar insumo
            </Boton>
          </div>
        </div>
      )}

      {despachando && (
        <ModalDespacho
          solicitudId={solicitudId}
          lineaId={despachando.id}
          personaId={personaId}
          insumoId={despachando.insumo_id}
          insumoNombre={
            insumos.data?.find((i) => i.id === despachando.insumo_id)?.nombre ??
            "el insumo"
          }
          pendiente={
            despachando.cantidad_requerida - despachando.cantidad_entregada
          }
          abierto
          onCerrar={() => setDespachando(null)}
        />
      )}

      {verFormularios && (
        <ModalFormulariosLinea
          detalleSolicitudId={verFormularios.id}
          insumoNombre={
            insumos.data?.find((i) => i.id === verFormularios.insumo_id)
              ?.nombre ?? "este insumo"
          }
          soloLectura={!solicitudActiva || !verFormularios.activo}
          abierto
          onCerrar={() => setVerFormularios(null)}
        />
      )}
    </section>
  );
}

export default SeccionLineasSolicitud;
