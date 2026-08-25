import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { aFechaDeInput, fechaDeHoy } from "../../lib/fechas";
import { errorDeCampo, mensajeDeError } from "../../lib/errores";
import {
  CLAVE_RECEPCIONES,
  crearRecepcion,
  editarRecepcion,
  type DatosRecepcion,
  type Recepcion,
} from "../../api/donaciones";
import type { InstitucionDonante } from "../../types/api";

/**
 * Alta y edición de la cabecera de una recepción.
 *
 * Solo la cabecera: quién donó, cuándo llegó y con qué código lo identifica la
 * institución. Lo que vino dentro se registra después, lote a lote, desde la
 * ficha. Separarlo no es un capricho de pantallas: cada lote pasa por
 * validaciones propias de la base —caducidad y código de fabricante según el
 * insumo— y agruparlos en un solo envío haría que el fallo de uno tirara el
 * registro de todos.
 */
function ModalRecepcion({
  recepcion,
  abierto,
  onCerrar,
  onCreada,
}: {
  /** Sin recepción, el modal da de alta. */
  recepcion?: Recepcion;
  abierto: boolean;
  onCerrar: () => void;
  /** Recibe el id recién creado para que el listado abra su ficha. */
  onCreada?: (recepcionId: number) => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  // Con inactivas: al editar hay que poder mostrar la institución ya guardada
  // aunque se haya dado de baja después, o el select saldría en blanco.
  const instituciones = useCatalogo<InstitucionDonante>(
    "instituciones-donantes",
    { incluirInactivos: true },
  );

  const [datos, setDatos] = useState({
    institucion_id: recepcion ? String(recepcion.institucion_id) : "",
    fecha_recepcion: recepcion
      ? aFechaDeInput(recepcion.fecha_recepcion)
      : fechaDeHoy(),
    codigo_lote: recepcion?.codigo_lote ?? "",
    observaciones_generales: recepcion?.observaciones_generales ?? "",
  });
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});

  const cambiar =
    (campo: keyof typeof datos) =>
    (
      evento: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setDatos((previos) => ({ ...previos, [campo]: evento.target.value }));

  /**
   * Cuerpo del PATCH: solo lo que cambió. El backend valida que la institución
   * esté activa únicamente cuando viene en el cuerpo, así que reenviarla sin
   * tocarla haría fallar la corrección de una observación en una recepción
   * cuya institución se dio de baja después.
   */
  const soloCambios = (): Partial<DatosRecepcion> => {
    if (!recepcion) return {};
    const cambios: Partial<DatosRecepcion> = {};
    if (Number(datos.institucion_id) !== recepcion.institucion_id) {
      cambios.institucion_id = Number(datos.institucion_id);
    }
    if (datos.fecha_recepcion !== aFechaDeInput(recepcion.fecha_recepcion)) {
      cambios.fecha_recepcion = datos.fecha_recepcion;
    }
    const codigo = datos.codigo_lote.trim() || null;
    if (codigo !== recepcion.codigo_lote) cambios.codigo_lote = codigo;
    const observaciones = datos.observaciones_generales.trim() || null;
    if (observaciones !== recepcion.observaciones_generales) {
      cambios.observaciones_generales = observaciones;
    }
    return cambios;
  };

  const mutacion = useMutation({
    mutationFn: async () => {
      if (recepcion) {
        const cambios = soloCambios();
        // Guardar sin haber tocado nada no debería costar una petición ni
        // dejar un UPDATE vacío en la bitácora de auditoría.
        if (Object.keys(cambios).length === 0) return recepcion;
        return editarRecepcion(recepcion.id, cambios);
      }
      return crearRecepcion({
        institucion_id: Number(datos.institucion_id),
        fecha_recepcion: datos.fecha_recepcion,
        codigo_lote: datos.codigo_lote.trim() || null,
        observaciones_generales: datos.observaciones_generales.trim() || null,
      });
    },
    onSuccess: async (resultado) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_RECEPCIONES] });
      avisar(
        recepcion ? "Recepción actualizada." : "Recepción registrada.",
        "exito",
      );
      onCerrar();
      if (!recepcion) onCreada?.(resultado.id);
    },
    onError: (error) => {
      setErrores({
        institucion_id: errorDeCampo(error, "institucion_id"),
        fecha_recepcion: errorDeCampo(error, "fecha_recepcion"),
        codigo_lote: errorDeCampo(error, "codigo_lote"),
      });
      avisar(mensajeDeError(error), "error");
    },
  });

  const completo = datos.institucion_id !== "" && datos.fecha_recepcion !== "";

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={recepcion ? "Editar recepción" : "Nueva recepción de donación"}
      descripcion="Los insumos que trajo el envío se registran después, uno a uno, desde la ficha de la recepción."
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
            variante="primaria"
            disabled={!completo}
            cargando={mutacion.isPending}
            textoCargando="Guardando…"
            onClick={() => mutacion.mutate()}
          >
            {recepcion ? "Guardar cambios" : "Registrar recepción"}
          </Boton>
        </GrupoBotones>
      }
    >
      <CampoSelect
        etiqueta="Institución donante"
        obligatorio
        value={datos.institucion_id}
        onChange={cambiar("institucion_id")}
        error={errores.institucion_id}
        ayuda="Si la institución no aparece, agréguela antes en Catálogos."
      >
        {instituciones.opciones.map((institucion) => (
          <option key={institucion.id} value={institucion.id}>
            {institucion.nombre}
            {institucion.activo ? "" : " (inactiva)"}
          </option>
        ))}
      </CampoSelect>

      <CampoTexto
        etiqueta="Fecha de recepción"
        type="date"
        obligatorio
        // La base tiene un CHECK de fecha_recepcion <= CURRENT_DATE: una
        // donación no puede haber llegado mañana.
        max={fechaDeHoy()}
        value={datos.fecha_recepcion}
        onChange={cambiar("fecha_recepcion")}
        error={errores.fecha_recepcion}
        ayuda="No puede ser futura. Por omisión, hoy."
      />

      <CampoTexto
        etiqueta="Código del envío"
        identificador
        maxLength={50}
        value={datos.codigo_lote}
        onChange={cambiar("codigo_lote")}
        error={errores.codigo_lote}
        ayuda="El que usa la institución donante para identificar la entrega. No es el código del fabricante: ese va en cada lote."
      />

      <CampoAreaTexto
        etiqueta="Observaciones generales"
        rows={3}
        maxLength={2000}
        value={datos.observaciones_generales}
        onChange={cambiar("observaciones_generales")}
      />
    </Modal>
  );
}

export default ModalRecepcion;
