import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_ENTREGAS,
  listarLotesFifo,
  registrarEntrega,
} from "../../api/entregas";
import { CLAVE_SOLICITUDES } from "../../api/solicitudes";
import type { Persona, ElementoCatalogo } from "../../types/api";
import BuscadorPersona from "../solicitudes/BuscadorPersona";
import estilos from "./Entregas.module.css";

/**
 * Despacho de una línea de solicitud: la única forma de crear una entrega.
 *
 * Se abre desde la ficha de la solicitud, sobre una línea concreta que ya
 * fija la persona y el insumo — lo único que este modal pregunta es cuánto
 * se entrega ahora (puede ser parcial) y quién lo recibe.
 *
 * La previsualización FEFO/FIFO es solo lectura y orientativa: la base
 * decide de verdad al registrar, con el stock real de ese momento. Si algo
 * cambió entre la previsualización y el envío, la base manda.
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

  const fifo = useQuery({
    queryKey: [CLAVE_ENTREGAS, "lotes-fifo", insumoId],
    queryFn: () => listarLotesFifo(insumoId),
  });

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
        insumo_id: insumoId,
        cantidad: Number(cantidad),
        detalle_solicitud_id: lineaId,
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

      <div className={estilos.previaFifo}>
        <p className={estilos.nota}>
          <strong>Vista previa del orden de despacho.</strong> La base decide
          con el stock real al momento de registrar; esto es orientativo.
        </p>
        {fifo.isPending ? (
          <p className={estilos.auxiliar}>Consultando lotes disponibles…</p>
        ) : fifo.isError ? (
          <p className={estilos.auxiliar}>
            No se pudo consultar la vista previa. Puede continuar de todos
            modos: la base valida el stock al registrar.
          </p>
        ) : fifo.data.length === 0 ? (
          <Insignia tono="rechazada">Sin lotes disponibles</Insignia>
        ) : (
          <div className={estilos.listaLotes}>
            {fifo.data.map((lote) => (
              <div
                key={lote.detalle_inventario_lote_id}
                className={estilos.lote}
              >
                <span className={estilos.loteCodigo}>
                  {lote.codigo_lote ?? "Sin código"}
                </span>
                <span className={estilos.auxiliar}>
                  {lote.fecha_caducidad
                    ? "Caduca " + formatearFecha(lote.fecha_caducidad)
                    : "Sin caducidad"}
                  {" · "}
                  {lote.cantidad_disponible.toLocaleString("es-GT")} disponibles
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ModalDespacho;
