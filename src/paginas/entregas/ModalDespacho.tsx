import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { mensajeDeError } from "../../lib/errores";
import { CLAVE_ENTREGAS, registrarEntrega } from "../../api/entregas";
import { CLAVE_SOLICITUDES } from "../../api/solicitudes";
import type { Persona, ElementoCatalogo } from "../../types/api";
import BuscadorPersona from "../solicitudes/BuscadorPersona";
import PreviaLotes from "./PreviaLotes";

/**
 * Despacho de una línea de solicitud.
 *
 * Se abre desde la ficha de la solicitud, sobre una línea concreta que ya
 * fija la persona y el insumo — lo único que este modal pregunta es cuánto
 * se entrega ahora (puede ser parcial) y quién lo recibe.
 *
 * Es uno de los dos caminos hacia una entrega. El otro es la entrega directa
 * de medicina o comida (ModalEntregaDirecta), que no nace de ninguna
 * solicitud porque no hay nada que aprobar.
 *
 * Registra un solo insumo aunque la API acepte varios: el despacho parte de
 * UNA línea, y cada línea es de un insumo. Despachar dos líneas a la vez
 * sería otra pantalla, con la lista de líneas pendientes de la solicitud.
 */
function ModalDespacho({
  solicitudId,
  lineaId,
  personaId,
  insumoId,
  insumoNombre,
  pendiente,
  abierto,
  onCerrar,
}: {
  solicitudId: number;
  lineaId: number;
  personaId: number;
  insumoId: number;
  insumoNombre: string;
  /** Lo que queda por entregar de esta línea (cantidad_requerida - cantidad_entregada). */
  pendiente: number;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  const [cantidad, setCantidad] = useState(String(pendiente));
  const [receptor, setReceptor] = useState<Persona | null>(null);
  const [parentescoId, setParentescoId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const parentescos = useCatalogo<ElementoCatalogo>("tipos-parentesco");

  const hayCambios =
    cantidad !== String(pendiente) ||
    receptor !== null ||
    parentescoId !== "" ||
    observaciones.trim() !== "";

  const cerrar = useCierreSeguro({ hayCambios, onCerrar });

  const mutacion = useMutation({
    mutationFn: () =>
      registrarEntrega({
        persona_id: personaId,
        insumos: [
          {
            insumo_id: insumoId,
            cantidad: Number(cantidad),
            detalle_solicitud_id: lineaId,
          },
        ],
        persona_receptor_id: receptor?.id ?? null,
        tipo_parentesco_receptor_id: receptor
          ? Number(parentescoId) || null
          : null,
        observaciones: observaciones.trim() || null,
      }),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_SOLICITUDES, solicitudId],
      });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_SOLICITUDES] });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_ENTREGAS] });
      avisar("Entrega registrada.", "exito");
      onCerrar();
    },
    // Incluye el rechazo por stock insuficiente (sp_registrar_entrega): el
    // backend ya redacta el mensaje en español con las cantidades exactas.
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cantidadNum = Number(cantidad);
  const cantidadValida =
    Number.isInteger(cantidadNum) &&
    cantidadNum > 0 &&
    cantidadNum <= pendiente;
  const receptorValido = !receptor || parentescoId !== "";
  const listoParaEnviar = cantidadValida && receptorValido;

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={"Despachar " + insumoNombre}
      descripcion={
        "Pendiente de esta línea: " + pendiente.toLocaleString("es-GT")
      }
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
            disabled={!listoParaEnviar}
            cargando={mutacion.isPending}
            textoCargando="Registrando…"
            onClick={() => mutacion.mutate()}
          >
            Registrar entrega
          </Boton>
        </GrupoBotones>
      }
    >
      <CampoTexto
        etiqueta="Cantidad a entregar"
        obligatorio
        type="number"
        min="1"
        max={pendiente}
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        error={
          cantidad !== "" && !cantidadValida
            ? "Debe ser un número entero entre 1 y " + pendiente + "."
            : undefined
        }
        ayuda="Puede ser parcial: lo que no se entregue ahora queda pendiente en la línea."
      />

      <BuscadorPersona
        etiqueta="Recibe un tercero (opcional)"
        personaElegida={receptor}
        onElegir={(p) => {
          setReceptor(p);
          if (!p) setParentescoId("");
        }}
        flotante={false}
      />

      {receptor && (
        <CampoSelect
          etiqueta="Parentesco con la persona beneficiaria"
          obligatorio
          value={parentescoId}
          onChange={(e) => setParentescoId(e.target.value)}
        >
          {parentescos.opciones.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </CampoSelect>
      )}

      <CampoAreaTexto
        etiqueta="Observaciones"
        rows={2}
        maxLength={2000}
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
      />

      <PreviaLotes insumoId={insumoId} />
    </Modal>
  );
}

export default ModalDespacho;
