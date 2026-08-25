import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoAreaTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { formatearFecha } from "../../lib/fechas";
import { errorDeCampo, mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  CLAVE_SEMAFORO,
  darBajaLote,
  type LoteSemaforo,
} from "../../api/inventario";
import { NIVELES } from "./semaforo";
import estilos from "./Inventario.module.css";

/**
 * Baja de un lote por vencimiento o daño.
 *
 * No es una edición del lote: la base ejecuta sp_dar_baja_insumo_vencido, que
 * descarta las existencias disponibles y deja el motivo escrito en las
 * observaciones. No hay reverso, así que el modal enseña primero qué lote es y
 * cuánto se va a descartar, y solo después pide el motivo.
 *
 * El motivo es obligatorio en el backend y aquí también, pero por una razón
 * distinta: sin él la bitácora registra que alguien tiró producto y no por
 * qué, que es lo único que un auditor va a querer saber.
 */
function ModalBajaLote({
  lote,
  abierto,
  onCerrar,
}: {
  lote: LoteSemaforo;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>();

  const nivel = NIVELES[lote.semaforo];

  const mutacion = useMutation({
    mutationFn: () =>
      darBajaLote(lote.detalle_inventario_lote_id, motivo.trim()),
    onSuccess: async () => {
      // El stock del insumo cambia con la baja, así que no basta con refrescar
      // el semáforo: la ficha mostraría existencias que ya no están.
      await Promise.all([
        clienteQuery.invalidateQueries({ queryKey: [CLAVE_SEMAFORO] }),
        clienteQuery.invalidateQueries({ queryKey: [CLAVE_INSUMOS] }),
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
      onCerrar={onCerrar}
      titulo="Dar de baja el lote"
      descripcion="Las existencias disponibles se descartan y el lote deja de aparecer en el inventario. No se puede deshacer."
      bloqueado={mutacion.isPending}
      pie={
        <GrupoBotones>
          <Boton
            variante="terciaria"
            onClick={onCerrar}
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
          <dd>{lote.insumo_nombre}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Lote</dt>
          <dd>{lote.codigo_lote ?? "—"}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Caducidad</dt>
          <dd>{formatearFecha(lote.fecha_caducidad)}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Se descartarán</dt>
          <dd>
            <span className={estilos.cantidad}>
              {lote.cantidad_disponible.toLocaleString("es-GT")}
            </span>{" "}
            <Insignia tono={nivel.tono}>{nivel.etiqueta}</Insignia>
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
        ayuda="Queda escrito en las observaciones del lote y en la bitácora. Diga qué pasó: vencido, dañado en bodega, envase roto."
      />
    </Modal>
  );
}

export default ModalBajaLote;
