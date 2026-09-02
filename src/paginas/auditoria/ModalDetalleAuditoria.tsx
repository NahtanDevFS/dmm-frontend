import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import type { RegistroAuditoria } from "../../api/auditoria";
import TablaCambios from "./TablaCambios";
import estilos from "./Auditoria.module.css";

const TONO_ACCION: Record<string, "aprobada" | "pendiente" | "rechazada"> = {
  INSERT: "aprobada",
  UPDATE: "pendiente",
  DELETE: "rechazada",
};

/** Fecha y hora completas en formato guatemalteco: no basta con el día para auditoría. */
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
 * Un solo registro de auditoría: qué cambió, quién y cuándo. Nunca editable
 * — es una bitácora, así que este modal solo tiene botón de Cerrar.
 */
function ModalDetalleAuditoria({
  registro,
  abierto,
  onCerrar,
}: {
  registro: RegistroAuditoria;
  abierto: boolean;
  onCerrar: () => void;
}) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={registro.tabla_afectada + " #" + registro.registro_id}
      descripcion={formatearFechaHora(registro.fecha_hora)}
      tamano="amplio"
      pie={
        <GrupoBotones>
          <Boton variante="terciaria" onClick={onCerrar}>
            Cerrar
          </Boton>
        </GrupoBotones>
      }
    >
      <div className={estilos.enModal}>
        <dl className={estilos.datos}>
          <div className={estilos.dato}>
            <dt>Acción</dt>
            <dd>
              <Insignia tono={TONO_ACCION[registro.accion]}>
                {registro.accion}
              </Insignia>
            </dd>
          </div>
          <div className={estilos.dato}>
            <dt>Realizado por</dt>
            <dd>{registro.usuario_username ?? "Sistema"}</dd>
          </div>
          <div className={estilos.dato}>
            <dt>Fecha y hora</dt>
            <dd>{formatearFechaHora(registro.fecha_hora)}</dd>
          </div>
        </dl>

        <TablaCambios
          anteriores={registro.valores_antiguos}
          nuevos={registro.valores_nuevos}
        />
      </div>
    </Modal>
  );
}

export default ModalDetalleAuditoria;
