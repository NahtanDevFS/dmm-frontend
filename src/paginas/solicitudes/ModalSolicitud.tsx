import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import {
  CampoSelect,
  CampoTexto,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { fechaDeHoy } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  listarInsumosParaSeleccion,
} from "../../api/inventario";
import {
  CLAVE_SOLICITUDES,
  crearSolicitud,
  type DatosLineaNueva,
} from "../../api/solicitudes";
import type { Persona, Programa } from "../../types/api";
import BuscadorPersona from "./BuscadorPersona";
import estilos from "./Solicitudes.module.css";

/** Una línea todavía sin enviar, con el nombre del insumo ya resuelto para mostrarla. */
interface LineaBorrador extends DatosLineaNueva {
  clave: number;
  insumoNombre: string;
}

/**
 * Alta de una solicitud de apoyo.
 *
 * A diferencia de una recepción de donación, aquí la cabecera y sus líneas
 * viajan juntas en un solo POST (crearSolicitudSchema exige lineas: [...]
 * con al menos una): la base las crea en una sola transacción, así que
 * armar el trámite completo antes de enviarlo —en vez de guardar línea por
 * línea como en una recepción— es lo que refleja cómo lo valida el backend.
 */
function ModalSolicitud({
  abierto,
  onCerrar,
  onCreada,
}: {
  abierto: boolean;
  onCerrar: () => void;
  /** Recibe el id recién creado para que el listado abra su ficha. */
  onCreada?: (solicitudId: number) => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [programaId, setProgramaId] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(fechaDeHoy());
  const [requiereAprobacion, setRequiereAprobacion] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<LineaBorrador[]>([]);

  // Formulario de la línea en curso, separado del resto: se limpia solo él
  // al agregar, sin tocar lo que ya se llenó de la cabecera.
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [errorLinea, setErrorLinea] = useState<string | undefined>();

  const programas = useCatalogo<Programa>("programas");
  const insumos = useQuery({
    queryKey: [CLAVE_INSUMOS, "seleccion"],
    queryFn: listarInsumosParaSeleccion,
  });

  const insumoElegido = insumos.data?.find((i) => i.id === Number(insumoId));

  const hayCambios =
    persona !== null ||
    programaId !== "" ||
    requiereAprobacion ||
    observaciones.trim() !== "" ||
    lineas.length > 0;

  const cerrar = useCierreSeguro({
    hayCambios,
    onCerrar,
    mensaje:
      "Hay una solicitud a medio registrar. Si cierra ahora, se pierde lo escrito, incluidas las líneas ya agregadas.",
  });

  const siguienteClave = useMemo(
    () =>
      lineas.length === 0 ? 1 : Math.max(...lineas.map((l) => l.clave)) + 1,
    [lineas],
  );

  const agregarLinea = () => {
    const cantidadNum = Number(cantidad);
    if (!insumoElegido) {
      setErrorLinea("Elija un insumo.");
      return;
    }
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      setErrorLinea("La cantidad debe ser un número entero mayor que cero.");
      return;
    }
    if (lineas.some((l) => l.insumo_id === insumoElegido.id)) {
      setErrorLinea(
        "Ese insumo ya está en la lista. Quítelo si quiere cambiar la cantidad.",
      );
      return;
    }

    setLineas((previas) => [
      ...previas,
      {
        clave: siguienteClave,
        insumo_id: insumoElegido.id,
        cantidad_requerida: cantidadNum,
        insumoNombre: insumoElegido.nombre,
      },
    ]);
    setInsumoId("");
    setCantidad("");
    setErrorLinea(undefined);
  };

  const quitarLinea = (clave: number) => {
    setLineas((previas) => previas.filter((l) => l.clave !== clave));
  };

  const mutacion = useMutation({
    mutationFn: () =>
      crearSolicitud({
        persona_id: persona!.id,
        programa_id: Number(programaId),
        fecha_solicitud: fechaSolicitud,
        requiere_aprobacion: requiereAprobacion,
        observaciones_trabajo_social: observaciones.trim() || null,
        lineas: lineas.map(({ insumo_id, cantidad_requerida }) => ({
          insumo_id,
          cantidad_requerida,
        })),
      }),
    onSuccess: async (resultado) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_SOLICITUDES] });
      avisar("Solicitud registrada.", "exito");
      onCerrar();
      onCreada?.(resultado.solicitud.id);
    },
    // Un rechazo por falta de stock (línea que exige stock y llegó en cero)
    // es un conflicto de negocio, no un dato mal escrito: el backend ya lo
    // redacta en español y dice qué hacer (registrarlo en lista de espera),
    // así que se muestra tal cual, como aviso y no como error de campo.
    onError: (error) => {
      avisar(mensajeDeError(error), "error");
    },
  });

  const listoParaEnviar =
    persona !== null &&
    programaId !== "" &&
    fechaSolicitud !== "" &&
    lineas.length > 0;

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Nueva solicitud de apoyo"
      descripcion="Elija a la persona, el programa y agregue cada insumo que necesita antes de registrar el trámite."
      bloqueado={mutacion.isPending}
      tamano="amplio"
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
            Registrar solicitud
          </Boton>
        </GrupoBotones>
      }
    >
      <div className={estilos.tarjeta}>
        <BuscadorPersona
          etiqueta="Persona solicitante"
          personaElegida={persona}
          onElegir={setPersona}
          obligatorio
          flotante={false}
        />

        <CampoSelect
          etiqueta="Programa"
          obligatorio
          value={programaId}
          onChange={(e) => setProgramaId(e.target.value)}
          ayuda="Si el programa no aparece, agréguelo antes en Catálogos."
        >
          {programas.opciones.map((programa) => (
            <option key={programa.id} value={programa.id}>
              {programa.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoTexto
          etiqueta="Fecha de la solicitud"
          type="date"
          obligatorio
          max={fechaDeHoy()}
          value={fechaSolicitud}
          onChange={(e) => setFechaSolicitud(e.target.value)}
          ayuda="No puede ser futura. Por omisión, hoy."
        />

        <label className={estilos.opcionesExtra}>
          <input
            type="checkbox"
            className={estilos.casilla}
            checked={requiereAprobacion}
            onChange={(e) => setRequiereAprobacion(e.target.checked)}
          />
          Requiere aprobación de Dirección antes de despachar
        </label>

        <CampoAreaTexto
          etiqueta="Observaciones de Trabajo Social"
          rows={3}
          maxLength={2000}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>

      <div className={estilos.tarjeta}>
        <h3 className={estilos.tituloFormulario}>Insumos solicitados</h3>

        {lineas.length === 0 ? (
          <p className={estilos.auxiliar}>
            Todavía no ha agregado ningún insumo.
          </p>
        ) : (
          <Tabla titulo="Insumos agregados a la solicitud">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Cantidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr key={linea.clave}>
                  <td>{linea.insumoNombre}</td>
                  <CeldaCantidad>{linea.cantidad_requerida}</CeldaCantidad>
                  <CeldaAcciones>
                    <Boton
                      pequeno
                      variante="terciaria"
                      onClick={() => quitarLinea(linea.clave)}
                    >
                      Quitar
                    </Boton>
                  </CeldaAcciones>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}

        <div className={estilos.formularioLote}>
          <div className={estilos.rejillaLote}>
            <CampoSelect
              etiqueta="Insumo"
              value={insumoId}
              onChange={(e) => {
                setInsumoId(e.target.value);
                setErrorLinea(undefined);
              }}
            >
              {insumos.data?.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoTexto
              etiqueta="Cantidad requerida"
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => {
                setCantidad(e.target.value);
                setErrorLinea(undefined);
              }}
              error={errorLinea}
            />
          </div>

          {insumoElegido?.bloquea_solicitud_sin_stock && (
            <Insignia tono="informativa">
              Este insumo exige stock disponible: si no hay existencias, el
              sistema no dejará agregarlo y sugerirá anotarlo en la lista de
              espera.
            </Insignia>
          )}

          <div className={estilos.accionLote}>
            <Boton variante="secundaria" onClick={agregarLinea}>
              + Agregar insumo
            </Boton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ModalSolicitud;
