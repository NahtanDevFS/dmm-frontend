import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoAreaTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { useAuth } from "../../auth/useAuth";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { DIRECCION, tieneRol, type ElementoCatalogo } from "../../types/api";
import {
  CLAVE_ENTREGAS,
  anularEntrega,
  anularDetalleEntrega,
  obtenerEntrega,
  type DetalleEntrega,
} from "../../api/entregas";
import { CLAVE_PERSONAS, obtenerPersona } from "../../api/personas";
import SeccionEvidencias from "./SeccionEvidencias";
import estilos from "./Entregas.module.css";

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className={estilos.dato}>
      <dt>{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Ficha de una entrega: la cabecera, los insumos entregados con los lotes
 * reales de donde salieron (no una previsualización — esto ya ocurrió) y las
 * evidencias.
 *
 * La anulación es de DIRECCION porque revierte inventario: cada lote recibe
 * de vuelta lo suyo, no un total, así que un despacho posterior que ya haya
 * tomado de otro lote no queda descuadrado.
 *
 * Se puede anular un solo insumo o la entrega completa. Lo primero existe
 * porque obligar a rehacer toda una entrega para corregir un renglón invita
 * a no corregir nada; la base rechaza los casos que no se pueden deshacer
 * así, como un préstamo ya devuelto cuyo stock volvió al inventario.
 */
function ModalFichaEntrega({
  entregaId,
  abierto,
  onCerrar,
}: {
  entregaId: number;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { usuario } = useAuth();
  const { avisar, confirmar } = useAvisos();

  const [borradorEvidencia, setBorradorEvidencia] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [anulandoDetalle, setAnulandoDetalle] = useState<DetalleEntrega | null>(
    null,
  );
  const [motivoDetalle, setMotivoDetalle] = useState("");

  const cerrar = useCierreSeguro({
    hayCambios: borradorEvidencia,
    onCerrar,
    mensaje:
      "Hay una evidencia a medio adjuntar. Si cierra ahora se pierde lo escrito; lo ya registrado se conserva.",
  });

  const consulta = useQuery({
    queryKey: [CLAVE_ENTREGAS, entregaId],
    queryFn: () => obtenerEntrega(entregaId),
    enabled: Number.isInteger(entregaId),
  });

  const entrega = consulta.data;

  const persona = useQuery({
    queryKey: [CLAVE_PERSONAS, entrega?.persona_id],
    queryFn: () => obtenerPersona(entrega!.persona_id),
    enabled: entrega !== undefined,
  });

  const receptor = useQuery({
    queryKey: [CLAVE_PERSONAS, entrega?.persona_receptor_id],
    queryFn: () => obtenerPersona(entrega!.persona_receptor_id!),
    enabled: entrega !== undefined && entrega.persona_receptor_id !== null,
  });

  const parentescos = useCatalogo<ElementoCatalogo>("tipos-parentesco");

  const nombreParentesco = parentescos.opciones.find(
    (p) => p.id === entrega?.tipo_parentesco_receptor_id,
  )?.nombre;

  const anulacion = useMutation({
    mutationFn: () => anularEntrega(entregaId, motivo.trim()),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_ENTREGAS, entregaId],
      });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_ENTREGAS] });
      avisar(
        "Entrega anulada. El inventario se devolvió a cada lote de origen.",
        "exito",
      );
      setAnulando(false);
      setMotivo("");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const anulacionDetalle = useMutation({
    mutationFn: () =>
      anularDetalleEntrega(
        entregaId,
        anulandoDetalle!.id,
        motivoDetalle.trim(),
      ),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_ENTREGAS, entregaId],
      });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_ENTREGAS] });
      avisar(
        "Insumo anulado. Su inventario volvió a los lotes de origen; el resto de la entrega sigue vigente.",
        "exito",
      );
      setAnulandoDetalle(null);
      setMotivoDetalle("");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const puedeAnular = tieneRol(usuario?.rol, DIRECCION);

  return (
    <>
      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={
          entrega && persona.data
            ? "Entrega a " + persona.data.nombres + " " + persona.data.apellidos
            : "Entrega"
        }
        descripcion={
          entrega ? formatearFecha(entrega.fecha_entrega) : undefined
        }
        tamano="amplio"
        bloqueado={anulacion.isPending}
        pie={
          <GrupoBotones>
            <Boton variante="terciaria" onClick={cerrar}>
              Cerrar
            </Boton>
          </GrupoBotones>
        }
      >
        {consulta.isPending ? (
          <>
            <Esqueleto ancho={280} alto={28} />
            <div style={{ marginTop: 24 }}>
              <Esqueleto alto={16} />
            </div>
          </>
        ) : consulta.isError || !entrega ? (
          <EstadoVacio
            titulo="No se pudo cargar la entrega"
            texto={mensajeDeError(consulta.error)}
            accion={
              <Boton
                variante="secundaria"
                onClick={() => void consulta.refetch()}
              >
                Reintentar
              </Boton>
            }
          />
        ) : (
          <div className={estilos.enModal}>
            {!entrega.activo && (
              <p className={estilos.inactiva}>
                Esta entrega está anulada: el inventario se devolvió a cada lote
                de origen. Lo ya registrado se conserva.
              </p>
            )}

            <section
              className={estilos.tarjeta}
              aria-labelledby="ent-generales"
            >
              <div className={estilos.tituloTarjeta}>
                <h2 id="ent-generales">Datos generales</h2>
              </div>
              <dl className={estilos.datos}>
                <Dato titulo="Persona beneficiaria">
                  {persona.data
                    ? persona.data.nombres + " " + persona.data.apellidos
                    : "—"}
                </Dato>
                <Dato titulo="Fecha de entrega">
                  {formatearFecha(entrega.fecha_entrega)}
                </Dato>
                <Dato titulo="Recibió">
                  {entrega.persona_receptor_id === null
                    ? "La misma persona beneficiaria"
                    : receptor.data
                      ? receptor.data.nombres +
                        " " +
                        receptor.data.apellidos +
                        (nombreParentesco ? " (" + nombreParentesco + ")" : "")
                      : "—"}
                </Dato>
                <Dato titulo="Estado">
                  {entrega.activo ? (
                    <Insignia tono="aprobada">Vigente</Insignia>
                  ) : (
                    <Insignia tono="rechazada">Anulada</Insignia>
                  )}
                </Dato>
                <Dato titulo="Observaciones">
                  {entrega.observaciones ?? "—"}
                </Dato>
              </dl>
            </section>

            <section className={estilos.tarjeta} aria-labelledby="ent-insumos">
              <div className={estilos.tituloTarjeta}>
                <h2 id="ent-insumos">Insumos entregados</h2>
              </div>
              <p className={estilos.nota}>
                Cada insumo con los lotes de donde salió, en el orden FEFO/FIFO
                que decidió la base al registrar la entrega.
              </p>

              {entrega.detalles.length === 0 ? (
                <EstadoVacio
                  titulo="Sin insumos"
                  texto="Esta entrega no tiene renglones registrados."
                />
              ) : (
                <div className={estilos.listaLotes}>
                  {entrega.detalles.map((detalle) => (
                    <div key={detalle.id} className={estilos.renglon}>
                      <div className={estilos.renglonCabecera}>
                        <div>
                          <p className={estilos.loteCodigo}>
                            {detalle.insumo_nombre}
                          </p>
                          <p className={estilos.auxiliar}>
                            {detalle.cantidad_entregada.toLocaleString("es-GT")}{" "}
                            unidades
                            {detalle.solicitud_id !== null &&
                              " · de la solicitud #" + detalle.solicitud_id}
                          </p>
                        </div>

                        <div className={estilos.acciones}>
                          {!detalle.activo && (
                            <Insignia tono="rechazada">Anulado</Insignia>
                          )}
                          {/*
                            El préstamo ya no se registra desde aquí: se hace
                            completo en su módulo, entrega y contrato en un
                            solo paso. Dejarlo también acá volvía a abrir dos
                            caminos para lo mismo.
                          */}
                          {detalle.prestamo_devuelto ? (
                            <Insignia tono="aprobada">Equipo devuelto</Insignia>
                          ) : (
                            detalle.tiene_prestamo && (
                              <Insignia tono="neutra">En préstamo</Insignia>
                            )
                          )}
                          {detalle.activo &&
                            entrega.activo &&
                            puedeAnular &&
                            !detalle.tiene_prestamo && (
                              <Boton
                                pequeno
                                variante="terciaria"
                                onClick={() => {
                                  setAnulandoDetalle(detalle);
                                  setMotivoDetalle("");
                                }}
                              >
                                Anular este insumo
                              </Boton>
                            )}
                        </div>
                      </div>

                      {/* El reparto por lotes: informativo, nadie lo eligió. */}
                      {detalle.lotes.map((lote) => (
                        <p key={lote.id} className={estilos.auxiliar}>
                          {/*
                            En equipo con serie, lo que identifica la pieza es
                            la serie del fabricante. El código de lote solo
                            dice en qué envío llegó, que para saber cuál silla
                            salió no sirve de nada.
                          */}
                          {detalle.serie_por_unidad
                            ? "Serie " + (lote.numero_serie ?? "sin registrar")
                            : lote.codigo_lote
                              ? "Lote " + lote.codigo_lote
                              : "Sin código de lote"}
                          {detalle.serie_por_unidad &&
                            lote.codigo_lote &&
                            " · envío " + lote.codigo_lote}
                          {" · "}
                          {lote.cantidad_entregada.toLocaleString("es-GT")}{" "}
                          unidades
                          {lote.fecha_caducidad &&
                            " · caduca el " +
                              formatearFecha(lote.fecha_caducidad)}
                        </p>
                      ))}

                      {/*
                        Con préstamo de por medio la anulación no se ofrece.
                        Si sigue vigente, anular dejaría un contrato apuntando
                        a algo que el sistema diría que nunca se entregó; y si
                        ya se devolvió, el stock volvió al lote en ese momento
                        y anular lo sumaría una segunda vez. La base rechaza
                        las dos cosas: aquí se explica antes de intentarlo.
                      */}
                      {detalle.activo &&
                        entrega.activo &&
                        puedeAnular &&
                        detalle.tiene_prestamo && (
                          <p className={estilos.auxiliar}>
                            {detalle.prestamo_devuelto
                              ? "No se puede anular: el equipo ya se devolvió y su stock volvió al inventario."
                              : "No se puede anular mientras el préstamo siga vigente. Ciérrelo desde Préstamos."}
                          </p>
                        )}

                      {!detalle.activo && detalle.motivo_anulacion && (
                        <p className={estilos.auxiliar}>
                          {detalle.motivo_anulacion}
                          {detalle.fecha_anulacion &&
                            " (" +
                              formatearFecha(detalle.fecha_anulacion) +
                              ")"}
                        </p>
                      )}

                      {anulandoDetalle?.id === detalle.id && (
                        <div className={estilos.anulacion}>
                          <CampoAreaTexto
                            etiqueta="Motivo de la anulación"
                            obligatorio
                            rows={2}
                            maxLength={500}
                            value={motivoDetalle}
                            onChange={(e) => setMotivoDetalle(e.target.value)}
                            ayuda="Queda guardado junto al renglón. La foto del formulario firmado seguirá mostrando este insumo, así que conviene explicar la diferencia."
                          />
                          <GrupoBotones>
                            <Boton
                              variante="terciaria"
                              onClick={() => setAnulandoDetalle(null)}
                              disabled={anulacionDetalle.isPending}
                            >
                              Cancelar
                            </Boton>
                            <Boton
                              variante="rechazar"
                              disabled={motivoDetalle.trim() === ""}
                              cargando={anulacionDetalle.isPending}
                              textoCargando="Anulando…"
                              onClick={() => anulacionDetalle.mutate()}
                            >
                              Anular insumo
                            </Boton>
                          </GrupoBotones>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <SeccionEvidencias
              entregaId={entrega.id}
              evidencias={entrega.evidencias}
              onBorrador={setBorradorEvidencia}
            />

            {puedeAnular && entrega.activo && (
              <section
                className={estilos.anulacion}
                aria-labelledby="ent-anular"
              >
                <div className={estilos.tituloTarjeta}>
                  <h2 id="ent-anular">Anulación</h2>
                </div>
                <p className={estilos.nota}>
                  Anular devuelve cada unidad a su lote de origen, no a un
                  total: es seguro aunque otro despacho posterior ya haya tomado
                  de otro lote del mismo insumo.
                </p>

                {anulando ? (
                  <>
                    <CampoAreaTexto
                      etiqueta="Motivo de la anulación"
                      obligatorio
                      rows={3}
                      maxLength={500}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                    <GrupoBotones>
                      <Boton
                        variante="terciaria"
                        disabled={anulacion.isPending}
                        onClick={() => {
                          setAnulando(false);
                          setMotivo("");
                        }}
                      >
                        Volver
                      </Boton>
                      <Boton
                        variante="rechazar"
                        disabled={motivo.trim() === ""}
                        cargando={anulacion.isPending}
                        textoCargando="Anulando…"
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: "Anular entrega",
                            mensaje:
                              "Se devolverá cada unidad a su lote de origen. No se puede deshacer.",
                            textoConfirmar: "Anular entrega",
                            destructiva: true,
                          });
                          if (ok) anulacion.mutate();
                        }}
                      >
                        Confirmar anulación
                      </Boton>
                    </GrupoBotones>
                  </>
                ) : (
                  <Boton variante="rechazar" onClick={() => setAnulando(true)}>
                    Anular entrega
                  </Boton>
                )}
              </section>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export default ModalFichaEntrega;
