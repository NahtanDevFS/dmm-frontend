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
import { RESOLUCION_SOLICITUD, tieneRol, type Programa } from "../../types/api";
import {
  CLAVE_SOLICITUDES,
  aprobarSolicitud,
  cancelarSolicitud,
  obtenerSolicitud,
  rechazarSolicitud,
} from "../../api/solicitudes";
import { CLAVE_PERSONAS, obtenerPersona } from "../../api/personas";
import SeccionLineasSolicitud from "./SeccionLineasSolicitud";
import SeccionRecetas from "./SeccionRecetas";
import estilos from "./Solicitudes.module.css";

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className={estilos.dato}>
      <dt>{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Ficha de una solicitud de apoyo: la cabecera del trámite, sus líneas por
 * insumo, las recetas que lo respaldan y, para DIRECTORA, la resolución.
 *
 * La región de aprobar/rechazar se aparta a propósito del resto de la ficha
 * (borde superior Rosa 300, según el manual: pertenece a otro rol) y ni
 * siquiera se monta para quien no es DIRECTORA — no es solo un botón oculto,
 * es una decisión de negocio (types/api.ts, RESOLUCION_SOLICITUD) que la
 * interfaz respeta aunque el backend admita también a ADMINISTRADOR.
 */
function ModalFichaSolicitud({
  solicitudId,
  abierto,
  onCerrar,
}: {
  solicitudId: number;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { usuario } = useAuth();
  const { avisar, confirmar } = useAvisos();

  const [borradores, setBorradores] = useState({
    lineas: false,
    recetas: false,
  });
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [rechazando, setRechazando] = useState(false);

  const cerrar = useCierreSeguro({
    hayCambios: borradores.lineas || borradores.recetas,
    onCerrar,
    mensaje:
      "Hay un formulario a medio llenar en esta solicitud. Si cierra ahora se pierde lo escrito; lo ya registrado se conserva.",
  });

  const consulta = useQuery({
    queryKey: [CLAVE_SOLICITUDES, solicitudId],
    queryFn: () => obtenerSolicitud(solicitudId),
    enabled: Number.isInteger(solicitudId),
  });

  const solicitud = consulta.data;

  const programas = useCatalogo<Programa>("programas", {
    incluirInactivos: true,
  });

  // La persona no viaja resuelta en la solicitud, solo su id: se busca por
  // separado, igual que la ficha de recepción resuelve la institución.
  const persona = useQuery({
    queryKey: [CLAVE_PERSONAS, solicitud?.persona_id],
    queryFn: () => obtenerPersona(solicitud!.persona_id),
    enabled: solicitud !== undefined,
  });

  const resolucion = useMutation({
    mutationFn: (accion: "aprobar" | "rechazar") =>
      accion === "aprobar"
        ? aprobarSolicitud(solicitudId)
        : rechazarSolicitud(solicitudId, motivoRechazo.trim()),
    onSuccess: async (_datos, accion) => {
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_SOLICITUDES, solicitudId],
      });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_SOLICITUDES] });
      avisar(
        accion === "aprobar" ? "Solicitud aprobada." : "Solicitud rechazada.",
        "exito",
      );
      setRechazando(false);
      setMotivoRechazo("");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cancelacionCompleta = useMutation({
    mutationFn: (motivo?: string) => cancelarSolicitud(solicitudId, motivo),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_SOLICITUDES, solicitudId],
      });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_SOLICITUDES] });
      avisar("Solicitud cancelada.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const puedeResolver = tieneRol(usuario?.rol, RESOLUCION_SOLICITUD);
  const pendienteDeAprobacion =
    solicitud?.requiere_aprobacion === true && solicitud?.aprobada === false;

  const programa = programas.opciones.find(
    (p) => p.id === solicitud?.programa_id,
  );

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={
        solicitud && persona.data
          ? "Solicitud de " +
            persona.data.nombres +
            " " +
            persona.data.apellidos
          : "Solicitud de apoyo"
      }
      descripcion={
        solicitud
          ? [formatearFecha(solicitud.fecha_solicitud), programa?.nombre]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      tamano="amplio"
      bloqueado={resolucion.isPending || cancelacionCompleta.isPending}
      pie={
        <GrupoBotones>
          <Boton variante="terciaria" onClick={cerrar}>
            Cerrar
          </Boton>
          {solicitud?.activo && (
            <Boton
              variante="terciaria"
              cargando={cancelacionCompleta.isPending}
              onClick={async () => {
                const ok = await confirmar({
                  titulo: "Cancelar solicitud",
                  mensaje:
                    "Se cancelarán todas las líneas activas de este trámite. No se puede deshacer.",
                  textoConfirmar: "Cancelar solicitud",
                  destructiva: true,
                });
                if (ok) cancelacionCompleta.mutate(undefined);
              }}
            >
              Cancelar solicitud
            </Boton>
          )}
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
      ) : consulta.isError || !solicitud ? (
        <EstadoVacio
          titulo="No se pudo cargar la solicitud"
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
          {!solicitud.activo && (
            <p className={estilos.inactiva}>
              Esta solicitud está cancelada: sus líneas activas se cancelaron
              junto con ella. Lo ya registrado se conserva.
            </p>
          )}

          <section className={estilos.tarjeta} aria-labelledby="sol-generales">
            <div className={estilos.tituloTarjeta}>
              <h2 id="sol-generales">Datos generales</h2>
            </div>
            <dl className={estilos.datos}>
              <Dato titulo="Persona solicitante">
                {persona.data
                  ? persona.data.nombres + " " + persona.data.apellidos
                  : "—"}
              </Dato>
              <Dato titulo="Programa">{programa?.nombre ?? "—"}</Dato>
              <Dato titulo="Fecha de la solicitud">
                {formatearFecha(solicitud.fecha_solicitud)}
              </Dato>
              <Dato titulo="Aprobación">
                {!solicitud.requiere_aprobacion ? (
                  <Insignia tono="neutra">No requiere</Insignia>
                ) : solicitud.aprobada ? (
                  <Insignia tono="aprobada">
                    Aprobada
                    {solicitud.fecha_aprobacion &&
                      " el " + formatearFecha(solicitud.fecha_aprobacion)}
                  </Insignia>
                ) : (
                  <Insignia tono="pendiente">Pendiente de aprobación</Insignia>
                )}
              </Dato>
              <Dato titulo="Observaciones de Trabajo Social">
                {solicitud.observaciones_trabajo_social ?? "—"}
              </Dato>
            </dl>
          </section>

          <SeccionLineasSolicitud
            solicitudId={solicitud.id}
            personaId={solicitud.persona_id}
            lineas={solicitud.lineas}
            solicitudActiva={solicitud.activo}
            onBorrador={(hay) =>
              setBorradores((previos) => ({ ...previos, lineas: hay }))
            }
          />

          <SeccionRecetas
            solicitudId={solicitud.id}
            recetas={solicitud.recetas}
            onBorrador={(hay) =>
              setBorradores((previos) => ({ ...previos, recetas: hay }))
            }
          />

          {puedeResolver && pendienteDeAprobacion && solicitud.activo && (
            <section
              className={estilos.resolucion}
              aria-labelledby="sol-resolucion"
            >
              <div className={estilos.tituloTarjeta}>
                <h2 id="sol-resolucion">Resolución</h2>
              </div>
              <p className={estilos.nota}>
                Esta solicitud quedó marcada como que requiere su aprobación
                antes de poder despachar los insumos.
              </p>

              {rechazando ? (
                <>
                  <CampoAreaTexto
                    etiqueta="Motivo del rechazo"
                    obligatorio
                    rows={3}
                    maxLength={2000}
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    ayuda="Trabajo Social necesita este motivo para dar seguimiento con la persona."
                  />
                  <GrupoBotones>
                    <Boton
                      variante="terciaria"
                      disabled={resolucion.isPending}
                      onClick={() => {
                        setRechazando(false);
                        setMotivoRechazo("");
                      }}
                    >
                      Volver
                    </Boton>
                    <Boton
                      variante="rechazar"
                      disabled={motivoRechazo.trim() === ""}
                      cargando={resolucion.isPending}
                      textoCargando="Rechazando…"
                      onClick={() => resolucion.mutate("rechazar")}
                    >
                      Confirmar rechazo
                    </Boton>
                  </GrupoBotones>
                </>
              ) : (
                <GrupoBotones>
                  <Boton
                    variante="rechazar"
                    disabled={resolucion.isPending}
                    onClick={() => setRechazando(true)}
                  >
                    Rechazar solicitud
                  </Boton>
                  <Boton
                    variante="aprobar"
                    cargando={resolucion.isPending}
                    textoCargando="Aprobando…"
                    onClick={() => resolucion.mutate("aprobar")}
                  >
                    Aprobar solicitud
                  </Boton>
                </GrupoBotones>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

export default ModalFichaSolicitud;
