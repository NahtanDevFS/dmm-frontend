import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_RECEPCIONES,
  desactivarRecepcion,
  obtenerRecepcion,
  reactivarRecepcion,
} from "../../api/donaciones";
import type { InstitucionDonante } from "../../types/api";
import ModalRecepcion from "./ModalRecepcion";
import SeccionLotes from "./SeccionLotes";
import SeccionDocumentosRecepcion from "./SeccionDocumentosRecepcion";
import estilos from "./Donaciones.module.css";

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className={estilos.dato}>
      <dt>{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Ficha de recepción en modal sobre el listado
 * Muestra el envío y los lotes que contiene
 */
function ModalFichaRecepcion({
  recepcionId,
  abierto,
  onCerrar,
}: {
  recepcionId: number;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();
  const [editando, setEditando] = useState(false);
  /** Evita perder datos no guardados al cerrar el modal si hay borradores */
  const [borradores, setBorradores] = useState({
    lotes: false,
    documentos: false,
  });

  const cerrar = useCierreSeguro({
    hayCambios: borradores.lotes || borradores.documentos,
    onCerrar,
    mensaje:
      "Hay un formulario a medio llenar en esta recepción. Si cierra ahora se pierde lo escrito; lo ya registrado se conserva.",
  });

  const consulta = useQuery({
    queryKey: [CLAVE_RECEPCIONES, recepcionId],
    queryFn: () => obtenerRecepcion(recepcionId),
    enabled: Number.isInteger(recepcionId),
  });

  const instituciones = useCatalogo<InstitucionDonante>(
    "instituciones-donantes",
    { incluirInactivos: true },
  );

  const cambioDeEstado = useMutation({
    mutationFn: (activar: boolean) =>
      activar ? reactivarRecepcion(recepcionId) : desactivarRecepcion(recepcionId),
    onSuccess: async (_datos, activar) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_RECEPCIONES] });
      avisar(
        activar ? "Recepción reactivada." : "Recepción desactivada.",
        "exito",
      );
    },
    /* Muestra error del servidor (ej. 409 por lotes activos pendientes de baja) */
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const recepcion = consulta.data;
  const institucion = instituciones.opciones.find(
    (i) => i.id === recepcion?.institucion_id,
  );

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={
        recepcion && institucion
          ? "Donación de " + institucion.nombre
          : "Recepción de donación"
      }
      descripcion={
        recepcion
          ? [
              formatearFecha(recepcion.fecha_recepcion),
              recepcion.codigo_lote,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      tamano="amplio"
      bloqueado={cambioDeEstado.isPending}
      pie={
        <GrupoBotones>
          <Boton variante="terciaria" onClick={cerrar}>
            Cerrar
          </Boton>
          {recepcion &&
            (recepcion.activo ? (
              <Boton
                variante="terciaria"
                cargando={cambioDeEstado.isPending}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: "Desactivar recepción",
                    mensaje:
                      "El envío dejará de aparecer en el listado. Solo se puede si ya no le quedan lotes activos en inventario.",
                    textoConfirmar: "Desactivar",
                    destructiva: true,
                  });
                  if (ok) cambioDeEstado.mutate(false);
                }}
              >
                Desactivar
              </Boton>
            ) : (
              <Boton
                variante="secundaria"
                cargando={cambioDeEstado.isPending}
                onClick={() => cambioDeEstado.mutate(true)}
              >
                Reactivar
              </Boton>
            ))}
          {recepcion && (
            <Boton variante="secundaria" onClick={() => setEditando(true)}>
              Editar recepción
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
      ) : consulta.isError || !recepcion ? (
        <EstadoVacio
          titulo="No se pudo cargar la recepción"
          texto={mensajeDeError(consulta.error)}
          accion={
            <Boton variante="secundaria" onClick={() => void consulta.refetch()}>
              Reintentar
            </Boton>
          }
        />
      ) : (
        <div className={estilos.enModal}>
          {!recepcion.activo && (
            <p className={estilos.inactiva}>
              Esta recepción está desactivada: no aparece en el listado y no
              admite lotes nuevos. Los lotes que ya tenía se conservan.
            </p>
          )}

          <section className={estilos.tarjeta} aria-labelledby="don-generales">
            <div className={estilos.tituloTarjeta}>
              <h2 id="don-generales">Datos del envío</h2>
            </div>
            <dl className={estilos.datos}>
              <Dato titulo="Institución donante">
                {institucion?.nombre ?? "—"}
              </Dato>
              <Dato titulo="Fecha de recepción">
                {formatearFecha(recepcion.fecha_recepcion)}
              </Dato>
              <Dato titulo="Código del envío">
                <span className={estilos.datoIdentificador}>
                  {recepcion.codigo_lote ?? "—"}
                </span>
              </Dato>
              <Dato titulo="Estado">
                {recepcion.activo ? (
                  <Insignia tono="aprobada">Activa</Insignia>
                ) : (
                  <Insignia tono="neutra">Desactivada</Insignia>
                )}
              </Dato>
              <Dato titulo="Observaciones">
                {recepcion.observaciones_generales ?? "—"}
              </Dato>
            </dl>
          </section>

          <SeccionLotes
            recepcionId={recepcion.id}
            recepcionActiva={recepcion.activo}
            onBorrador={(hay) =>
              setBorradores((previos) => ({ ...previos, lotes: hay }))
            }
          />

          <SeccionDocumentosRecepcion
            recepcionId={recepcion.id}
            documentos={recepcion.documentos}
            onBorrador={(hay) =>
              setBorradores((previos) => ({ ...previos, documentos: hay }))
            }
          />

          {editando && (
            <ModalRecepcion
              recepcion={recepcion}
              abierto={editando}
              onCerrar={() => setEditando(false)}
            />
          )}
        </div>
      )}
    </Modal>
  );
}

export default ModalFichaRecepcion;
