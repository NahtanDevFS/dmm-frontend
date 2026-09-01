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
  obtenerEntrega,
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
 * Ficha de una entrega: la cabecera, los lotes reales de donde salió (no una
 * previsualización — esto ya ocurrió) y las evidencias.
 *
 * La anulación es de DIRECCION porque revierte inventario: cada detalle
 * vuelve a su lote de origen, no a un total, así que un despacho posterior
 * que ya haya tomado de otro lote no queda descuadrado.
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

  const puedeAnular = tieneRol(usuario?.rol, DIRECCION);

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={
        entrega && persona.data
          ? "Entrega a " + persona.data.nombres + " " + persona.data.apellidos
          : "Entrega"
      }
      descripcion={entrega ? formatearFecha(entrega.fecha_entrega) : undefined}
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

          <section className={estilos.tarjeta} aria-labelledby="ent-generales">
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
              <Dato titulo="Observaciones">{entrega.observaciones ?? "—"}</Dato>
            </dl>
          </section>

          <section className={estilos.tarjeta} aria-labelledby="ent-lotes">
            <div className={estilos.tituloTarjeta}>
              <h2 id="ent-lotes">Lotes de origen</h2>
            </div>
            <p className={estilos.nota}>
              De dónde salió cada unidad, en el orden FEFO/FIFO que decidió la
              base al registrar la entrega.
            </p>

            {entrega.detalles.length === 0 ? (
              <EstadoVacio
                titulo="Sin lotes"
                texto="Esta entrega no tiene renglones registrados."
              />
            ) : (
              <div className={estilos.listaLotes}>
                {entrega.detalles.map((detalle) => (
                  <div key={detalle.id} className={estilos.lote}>
                    <div>
                      <p className={estilos.loteCodigo}>
                        {detalle.insumo_nombre}
                        {detalle.codigo_lote &&
                          " — Lote " + detalle.codigo_lote}
                      </p>
                      {detalle.fecha_caducidad && (
                        <p className={estilos.auxiliar}>
                          Caduca el {formatearFecha(detalle.fecha_caducidad)}
                        </p>
                      )}
                    </div>
                    <div>
                      {!detalle.activo && (
                        <Insignia tono="neutra">Restituido</Insignia>
                      )}
                      <span className={estilos.auxiliar}>
                        {detalle.cantidad_entregada.toLocaleString("es-GT")}{" "}
                        unidades
                      </span>
                    </div>
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
            <section className={estilos.anulacion} aria-labelledby="ent-anular">
              <div className={estilos.tituloTarjeta}>
                <h2 id="ent-anular">Anulación</h2>
              </div>
              <p className={estilos.nota}>
                Anular devuelve cada unidad a su lote de origen, no a un total:
                es seguro aunque otro despacho posterior ya haya tomado de otro
                lote del mismo insumo.
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
  );
}

export default ModalFichaEntrega;
