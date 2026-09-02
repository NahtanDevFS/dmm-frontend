import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoTexto } from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { fechaDeHoy } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { CLAVE_CONTRATOS, crearContrato } from "../../api/prestamos";

/**
 * Registrar un contrato de préstamo sobre un renglón de entrega ya
 * existente. Se abre desde la ficha de la entrega («Registrar préstamo»),
 * nunca desde un formulario que pida el id a mano: el detalleEntregaId ya
 * viene fijado por el renglón concreto que se está mirando.
 */
function ModalNuevoPrestamo({
  detalleEntregaId,
  insumoNombre,
  abierto,
  onCerrar,
}: {
  detalleEntregaId: number;
  insumoNombre: string;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();
  const [fechaDevolucion, setFechaDevolucion] = useState("");

  const cerrar = useCierreSeguro({
    hayCambios: fechaDevolucion !== "",
    onCerrar,
  });

  const mutacion = useMutation({
    mutationFn: () =>
      crearContrato({
        detalle_entrega_id: detalleEntregaId,
        fecha_devolucion_pactada: fechaDevolucion,
      }),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_CONTRATOS] });
      avisar("Préstamo registrado.", "exito");
      onCerrar();
    },
    // Incluye "ese renglón de entrega ya tiene un contrato de préstamo".
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={"Registrar préstamo de " + insumoNombre}
      descripcion="Crea el contrato inicial. Podrá renovarlo o registrar la devolución después, desde Préstamos."
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
            variante="primaria"
            disabled={fechaDevolucion === ""}
            cargando={mutacion.isPending}
            textoCargando="Registrando…"
            onClick={() => mutacion.mutate()}
          >
            Registrar préstamo
          </Boton>
        </GrupoBotones>
      }
    >
      <CampoTexto
        etiqueta="Fecha de devolución pactada"
        obligatorio
        type="date"
        min={fechaDeHoy()}
        value={fechaDevolucion}
        onChange={(e) => setFechaDevolucion(e.target.value)}
      />
    </Modal>
  );
}

export default ModalNuevoPrestamo;
