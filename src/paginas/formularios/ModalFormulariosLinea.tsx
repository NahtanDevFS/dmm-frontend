import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_FORMULARIOS,
  listarFormulariosDeLinea,
  type FormularioDeLinea,
} from "../../api/formularios";
import ModalFormulario from "./ModalFormulario";
import estilos from "./Formularios.module.css";

/**
 * Lista los formularios que la categoría del insumo de una línea exige
 * antes de aprobar (equipo, típicamente), con el avance de cada uno. Desde
 * aquí se abre el formulario concreto a llenar.
 */
function ModalFormulariosLinea({
  detalleSolicitudId,
  insumoNombre,
  abierto,
  onCerrar,
  soloLectura,
}: {
  detalleSolicitudId: number;
  insumoNombre: string;
  abierto: boolean;
  onCerrar: () => void;
  soloLectura?: boolean;
}) {
  const [formularioAbierto, setFormularioAbierto] =
    useState<FormularioDeLinea | null>(null);

  const formularios = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "lineas", detalleSolicitudId],
    queryFn: () => listarFormulariosDeLinea(detalleSolicitudId),
  });

  return (
    <>
      <Modal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={"Formularios de " + insumoNombre}
        descripcion="Estos formularios los exige la categoría del insumo antes de poder aprobar la solicitud."
        pie={
          <GrupoBotones>
            <Boton variante="terciaria" onClick={onCerrar}>
              Cerrar
            </Boton>
          </GrupoBotones>
        }
      >
        {formularios.isPending ? (
          <Esqueleto alto={16} />
        ) : formularios.isError ? (
          <EstadoVacio
            titulo="No se pudieron cargar los formularios"
            texto={mensajeDeError(formularios.error)}
            accion={
              <Boton
                variante="secundaria"
                onClick={() => void formularios.refetch()}
              >
                Reintentar
              </Boton>
            }
          />
        ) : formularios.data.length === 0 ? (
          <EstadoVacio
            titulo="Sin formularios exigidos"
            texto="Este insumo no requiere ningún formulario adicional para aprobarse."
          />
        ) : (
          <div className={estilos.listaFormularios}>
            {formularios.data.map((formulario) => (
              <div key={formulario.id} className={estilos.filaFormulario}>
                <div>
                  <p className={estilos.nombreFormulario}>
                    {formulario.nombre}
                  </p>
                  {formulario.completado ? (
                    <Insignia tono="aprobada">Completo</Insignia>
                  ) : formulario.detalle_solicitud_formulario_id !== null ? (
                    <Insignia tono="pendiente">Borrador guardado</Insignia>
                  ) : (
                    <Insignia tono="informativa">Sin empezar</Insignia>
                  )}
                </div>
                <Boton
                  pequeno
                  variante="secundaria"
                  onClick={() => setFormularioAbierto(formulario)}
                >
                  {soloLectura ? "Ver" : "Llenar"}
                </Boton>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {formularioAbierto && (
        <ModalFormulario
          detalleSolicitudId={detalleSolicitudId}
          formularioId={formularioAbierto.id}
          nombreFormulario={formularioAbierto.nombre}
          abierto
          soloLectura={soloLectura}
          onCerrar={() => setFormularioAbierto(null)}
        />
      )}
    </>
  );
}

export default ModalFormulariosLinea;
