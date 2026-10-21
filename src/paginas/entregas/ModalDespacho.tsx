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
import estilos from "./Entregas.module.css";
import SubidaArchivo from "../../componentes/ui/SubidaArchivo";
import {
  AVISO_RECETA_NO_SUBIDA,
  AYUDA_RECETA,
  useSubidaReceta,
} from "./receta";
import { etiquetaDe } from "../../lib/etiquetas";

/* Despacho de una línea específica de solicitud
   Registra cuánto se entrega y quién recibe (camino alterno a entrega directa) */
function ModalDespacho({
  solicitudId,
  lineaId,
  personaId,
  insumoId,
  insumoNombre,
  pendiente,
  requiereReceta = false,
  abierto,
  onCerrar,
}: {
  solicitudId: number;
  lineaId: number;
  personaId: number;
  insumoId: number;
  insumoNombre: string;
  // Lo que queda por entregar de esta línea (cantidad_requerida - cantidad_entregada)
  pendiente: number;
  // Si el insumo exige receta médica para entregarse (medicamentos).
  requiereReceta?: boolean;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  const [cantidad, setCantidad] = useState(String(pendiente));
  const [receptor, setReceptor] = useState<Persona | null>(null);
  const [parentescoId, setParentescoId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [archivoReceta, setArchivoReceta] = useState<File | null>(null);
  const { subirReceta, listo: recetaDisponible } = useSubidaReceta();

  const parentescos = useCatalogo<ElementoCatalogo>("tipos-parentesco");

  const hayCambios =
    cantidad !== String(pendiente) ||
    receptor !== null ||
    parentescoId !== "" ||
    observaciones.trim() !== "" ||
    archivoReceta !== null;

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
    onSuccess: async (entrega) => {
      const recetaPendiente =
        requiereReceta &&
        archivoReceta !== null &&
        !(await subirReceta(entrega.id, archivoReceta));
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_SOLICITUDES, solicitudId],
      });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_SOLICITUDES] });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_ENTREGAS] });
      if (recetaPendiente) avisar(AVISO_RECETA_NO_SUBIDA, "advertencia");
      else avisar("Entrega registrada.", "exito");
      onCerrar();
    },
    // Incluye el rechazo por stock insuficiente (sp_registrar_entrega): el
    // backend ya redacta el mensaje en español con las cantidades exactas
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cantidadNum = Number(cantidad);
  const cantidadValida =
    Number.isInteger(cantidadNum) &&
    cantidadNum > 0 &&
    cantidadNum <= pendiente;
  const receptorValido = !receptor || parentescoId !== "";
  const listoParaEnviar =
    cantidadValida &&
    receptorValido &&
    // Sin receta no se despacha un medicamento
    (!requiereReceta || (archivoReceta !== null && recetaDisponible));

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

      {requiereReceta && (
        <div className={estilos.campoReceta}>
          <SubidaArchivo
            etiqueta="Receta médica"
            obligatorio
            ayuda={AYUDA_RECETA}
            archivo={archivoReceta}
            onCambiar={setArchivoReceta}
          />
        </div>
      )}

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
              {etiquetaDe(tipo.nombre)}
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
