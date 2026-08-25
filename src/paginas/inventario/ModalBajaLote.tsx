import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoAreaTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { formatearFecha } from "../../lib/fechas";
import { errorDeCampo, mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  CLAVE_SEMAFORO,
  darBajaLote,
} from "../../api/inventario";
import { CLAVE_RECEPCIONES } from "../../api/donaciones";
import { nivelDe } from "./semaforo";
import estilos from "./Inventario.module.css";

/**
 * Lo que el modal necesita saber del lote. Se pide en piezas sueltas y no como
 * una fila del semáforo porque lo abren dos sitios con formas distintas: el
 * semáforo, donde el lote llega con su nivel de caducidad ya calculado, y la
 * ficha de la recepción, donde llega como renglón del envío y sin semáforo.
 */
export interface LoteParaBaja {
  id: number;
  insumoNombre: string;
  /** Código del envío o del fabricante, según desde dónde se abra. */
  codigo: string | null;
  fechaCaducidad: string | null;
  cantidadDisponible: number;
  /** Nivel del semáforo, si quien abre lo conoce. */
  semaforo?: string | null;
}

/**
 * Baja de un lote.
 *
 * No es una edición: la base ejecuta sp_dar_baja_insumo_vencido, que descarta
 * las existencias disponibles y deja el motivo escrito en las observaciones.
 * No hay reverso, así que el modal enseña primero qué lote es y cuánto se va a
 * descartar, y solo después pide el motivo.
 *
 * Sirve para dos cosas que parecen distintas y en la base son la misma: el
 * producto que se venció o se dañó, y el renglón que se capturó mal. El
 * procedimiento admite dar de baja un lote no vencido —solo levanta un
 * WARNING— justo para eso, y es hoy la única forma de deshacer un lote mal
 * registrado, porque el API no tiene edición ni borrado de lotes.
 *
 * El motivo es obligatorio en el backend y aquí también, pero por una razón
 * distinta: sin él la bitácora registra que alguien descartó producto y no por
 * qué, que es lo único que un auditor va a querer saber. Y es lo que separa
 * «se venció» de «me equivoqué al teclear».
 */
function ModalBajaLote({
  lote,
  abierto,
  onCerrar,
}: {
  lote: LoteParaBaja;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>();

  const nivel = nivelDe(lote.semaforo ?? null);

  const cerrar = useCierreSeguro({
    hayCambios: motivo.trim() !== "",
    onCerrar,
    mensaje:
      "Escribió un motivo de baja que no se ha registrado. Si cierra ahora, se pierde y el lote sigue activo.",
  });

  const mutacion = useMutation({
    mutationFn: () => darBajaLote(lote.id, motivo.trim()),
    onSuccess: async () => {
      // La baja cambia el stock del insumo y la composición del envío del que
      // salió, así que no basta con refrescar el semáforo: la ficha del insumo
      // y la de la recepción mostrarían existencias que ya no están.
      await Promise.all([
        clienteQuery.invalidateQueries({ queryKey: [CLAVE_SEMAFORO] }),
        clienteQuery.invalidateQueries({ queryKey: [CLAVE_INSUMOS] }),
        clienteQuery.invalidateQueries({ queryKey: [CLAVE_RECEPCIONES] }),
      ]);
      avisar("Lote dado de baja.", "exito");
      onCerrar();
    },
    onError: (error) => {
      setErrorMotivo(errorDeCampo(error, "motivo"));
      avisar(mensajeDeError(error), "error");
    },
  });

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Dar de baja el lote"
      descripcion="Las existencias disponibles se descartan y el lote deja de aparecer en el inventario. No se puede deshacer."
      bloqueado={mutacion.isPending}
      pie={
        <GrupoBotones>
          <Boton
            variante="terciaria"
            onClick={cerrar}
            disabled={mutacion.isPending}
          >
            Cancelar
          </Boton>
          <Boton
            variante="rechazar"
            disabled={motivo.trim() === ""}
            cargando={mutacion.isPending}
            textoCargando="Dando de baja…"
            onClick={() => mutacion.mutate()}
          >
            Dar de baja
          </Boton>
        </GrupoBotones>
      }
    >
      <dl className={estilos.datos}>
        <div className={estilos.dato}>
          <dt>Insumo</dt>
          <dd>{lote.insumoNombre}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Lote</dt>
          <dd>{lote.codigo ?? "—"}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Caducidad</dt>
          <dd>{formatearFecha(lote.fechaCaducidad)}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Se descartarán</dt>
          <dd>
            <span className={estilos.cantidad}>
              {lote.cantidadDisponible.toLocaleString("es-GT")}
            </span>{" "}
            {nivel && <Insignia tono={nivel.tono}>{nivel.etiqueta}</Insignia>}
          </dd>
        </div>
      </dl>

      <CampoAreaTexto
        etiqueta="Motivo de la baja"
        obligatorio
        rows={3}
        maxLength={500}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        error={errorMotivo}
        ayuda="Queda escrito en las observaciones del lote y en la bitácora. Diga qué pasó: vencido, dañado en bodega, envase roto, error de captura."
      />
    </Modal>
  );
}

export default ModalBajaLote;
