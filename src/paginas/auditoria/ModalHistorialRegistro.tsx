import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_AUDITORIA,
  historialDeRegistro,
  type RegistroAuditoria,
} from "../../api/auditoria";
import ModalDetalleAuditoria from "./ModalDetalleAuditoria";
import estilos from "./Auditoria.module.css";

const TONO_ACCION: Record<string, "aprobada" | "pendiente" | "rechazada"> = {
  INSERT: "aprobada",
  UPDATE: "pendiente",
  DELETE: "rechazada",
};

function formatearFechaHora(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Línea de tiempo completa de un registro concreto: cada cambio que ha
 * tenido, del más antiguo al más reciente. Útil para «¿quién cambió esta
 * ficha, y en qué orden?» — la pregunta que un listado filtrado no responde
 * bien porque mezcla registros distintos.
 */
function ModalHistorialRegistro({
  tabla,
  registroId,
  abierto,
  onCerrar,
}: {
  tabla: string;
  registroId: number;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const [verDetalle, setVerDetalle] = useState<RegistroAuditoria | null>(null);

  const historial = useQuery({
    queryKey: [CLAVE_AUDITORIA, "historial", tabla, registroId],
    queryFn: () => historialDeRegistro(tabla, registroId),
  });

  return (
    <>
      <Modal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={"Historial de " + tabla + " #" + registroId}
        tamano="amplio"
        pie={
          <GrupoBotones>
            <Boton variante="terciaria" onClick={onCerrar}>
              Cerrar
            </Boton>
          </GrupoBotones>
        }
      >
        {historial.isPending ? (
          <Esqueleto alto={16} />
        ) : historial.isError ? (
          <EstadoVacio
            titulo="No se pudo cargar el historial"
            texto={mensajeDeError(historial.error)}
            accion={
              <Boton
                variante="secundaria"
                onClick={() => void historial.refetch()}
              >
                Reintentar
              </Boton>
            }
          />
        ) : historial.data.datos.length === 0 ? (
          <EstadoVacio
            titulo="Sin historial"
            texto="Este registro no tiene cambios registrados."
          />
        ) : (
          <Tabla titulo={"Historial de " + tabla + " #" + registroId}>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Acción</th>
                <th>Realizado por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.data.datos.map((registro) => (
                <tr key={registro.id}>
                  <CeldaCantidad>
                    {formatearFechaHora(registro.fecha_hora)}
                  </CeldaCantidad>
                  <td>
                    <Insignia tono={TONO_ACCION[registro.accion]}>
                      {registro.accion}
                    </Insignia>
                  </td>
                  <td className={estilos.usuario}>
                    {registro.usuario_username ?? "Sistema"}
                  </td>
                  <CeldaAcciones>
                    <Boton
                      pequeno
                      variante="secundaria"
                      onClick={() => setVerDetalle(registro)}
                    >
                      Ver cambios
                    </Boton>
                  </CeldaAcciones>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Modal>

      {verDetalle && (
        <ModalDetalleAuditoria
          registro={verDetalle}
          abierto
          onCerrar={() => setVerDetalle(null)}
        />
      )}
    </>
  );
}

export default ModalHistorialRegistro;
