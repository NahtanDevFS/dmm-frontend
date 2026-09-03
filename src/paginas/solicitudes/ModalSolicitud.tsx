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
  listarStockInsumos,
  listarPresentaciones,
} from "../../api/inventario";
import {
  CLAVE_FORMULARIOS,
  listarFormulariosDeInsumo,
} from "../../api/formularios";
import {
  CLAVE_SOLICITUDES,
  crearSolicitud,
  type DatosLineaNueva,
} from "../../api/solicitudes";
import type { Persona, Programa, ElementoCatalogo } from "../../types/api";
import BuscadorPersona from "./BuscadorPersona";
import estilos from "./Solicitudes.module.css";

/** Una línea todavía sin enviar, con los nombres ya resueltos para mostrarla. */
interface LineaBorrador extends DatosLineaNueva {
  clave: number;
  insumoNombre: string;
  modalidadNombre: string;
  /** Lo pedido tal como se dijo: "2 cajas (200 Tableta)". */
  descripcionCantidad: string;
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
  const [modalidadId, setModalidadId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [presentacionId, setPresentacionId] = useState("");
  const [errorLinea, setErrorLinea] = useState<string | undefined>();

  const programas = useCatalogo<Programa>("programas");
  const modalidades = useCatalogo<ElementoCatalogo>("modalidades-solicitud");
  const unidades = useCatalogo<ElementoCatalogo>("unidades-medida", {
    incluirInactivos: true,
  });

  const nombreUnidad = (id: number) =>
    unidades.opciones.find((u) => u.id === id)?.nombre ?? "Unidad";

  // Con existencias, no solo nombres: quien atiende necesita saber si hay y
  // cuánto antes de comprometer una cantidad, sin abrir otra pantalla.
  const insumos = useQuery({
    queryKey: [CLAVE_INSUMOS, "stock"],
    queryFn: () => listarStockInsumos(),
  });

  const insumoElegido = insumos.data?.find(
    (i) => i.insumo_id === Number(insumoId),
  );

  const filasStock = insumos.data;

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, NonNullable<typeof filasStock>>();
    for (const fila of filasStock ?? []) {
      const lista = grupos.get(fila.categoria_nombre);
      if (lista) lista.push(fila);
      else grupos.set(fila.categoria_nombre, [fila]);
    }
    return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [filasStock]);

  /**
   * Las presentaciones del insumo elegido, para poder pedir "2 cajas" en vez
   * de obligar a que quien atiende multiplique de cabeza.
   */
  const presentaciones = useQuery({
    queryKey: [CLAVE_INSUMOS, insumoId, "presentaciones"],
    queryFn: () => listarPresentaciones(Number(insumoId), false),
    enabled: insumoId !== "",
  });

  const presentacionElegida = presentaciones.data?.find(
    (p) => p.id === Number(presentacionId),
  );

  /**
   * Lo pedido convertido a unidad base. El backend vuelve a hacer esta cuenta
   * al guardar —es él quien manda— pero mostrarla aquí evita que alguien
   * descubra recién al enviar que pidió diez veces más de lo que quería.
   */
  const equivalenteBase =
    presentacionElegida && Number(cantidad) > 0
      ? Math.round(
          Number(presentacionElegida.unidades_por_presentacion) *
            Number(cantidad),
        )
      : null;

  /**
   * Los formularios que este insumo va a exigir bajo esta modalidad. Se
   * consultan al elegir, no al aprobar: el estudio socioeconómico hay que
   * llenarlo con la persona presente, y descubrirlo cuando ya se fue vuelve
   * el dato irrecuperable.
   */
  const formulariosExigidos = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "insumo", insumoId, modalidadId],
    queryFn: () =>
      listarFormulariosDeInsumo(Number(insumoId), Number(modalidadId)),
    enabled: insumoId !== "" && modalidadId !== "",
  });

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
    if (modalidadId === "") {
      setErrorLinea("Elija la modalidad: donación o préstamo.");
      return;
    }
    if (lineas.some((l) => l.insumo_id === insumoElegido.insumo_id)) {
      setErrorLinea(
        "Ese insumo ya está en la lista. Quítelo si quiere cambiar la cantidad.",
      );
      return;
    }

    setLineas((previas) => [
      ...previas,
      {
        clave: siguienteClave,
        insumo_id: insumoElegido.insumo_id,
        // Con presentación se manda lo pedido tal cual y el backend convierte;
        // sin ella, la cantidad ya está en unidad base.
        cantidad_requerida: presentacionElegida ? undefined : cantidadNum,
        presentacion_solicitud_id: presentacionElegida?.id,
        cantidad_presentacion: presentacionElegida ? cantidadNum : undefined,
        modalidad_solicitud_id: Number(modalidadId),
        insumoNombre: insumoElegido.insumo_nombre,
        descripcionCantidad: presentacionElegida
          ? cantidadNum.toLocaleString("es-GT") +
            " " +
            nombreUnidad(presentacionElegida.unidad_medida_id) +
            " (" +
            (equivalenteBase ?? 0).toLocaleString("es-GT") +
            " " +
            insumoElegido.unidad_base_nombre +
            ")"
          : cantidadNum.toLocaleString("es-GT") +
            " " +
            insumoElegido.unidad_base_nombre,
        modalidadNombre:
          modalidades.opciones.find((m) => m.id === Number(modalidadId))
            ?.nombre ?? "",
      },
    ]);
    setInsumoId("");
    setModalidadId("");
    setPresentacionId("");
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
        lineas: lineas.map(
          ({
            insumo_id,
            cantidad_requerida,
            presentacion_solicitud_id,
            cantidad_presentacion,
            modalidad_solicitud_id,
          }) => ({
            insumo_id,
            cantidad_requerida,
            presentacion_solicitud_id,
            cantidad_presentacion,
            modalidad_solicitud_id,
          }),
        ),
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
                <th>Modalidad</th>
                <th>Cantidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr key={linea.clave}>
                  <td>{linea.insumoNombre}</td>
                  <td>{linea.modalidadNombre}</td>
                  <CeldaCantidad>{linea.descripcionCantidad}</CeldaCantidad>
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
                // Las presentaciones son del insumo anterior: si no se limpia,
                // quedaría elegida una que no le pertenece.
                setPresentacionId("");
                setErrorLinea(undefined);
              }}
            >
              {porCategoria.map(([categoria, lista]) => (
                <optgroup key={categoria} label={categoria}>
                  {lista.map((insumo) => (
                    <option key={insumo.insumo_id} value={insumo.insumo_id}>
                      {insumo.insumo_nombre}
                      {" — "}
                      {insumo.stock_total.toLocaleString("es-GT")}{" "}
                      {insumo.unidad_base_nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </CampoSelect>

            <CampoSelect
              etiqueta="Se pide en"
              value={presentacionId}
              onChange={(e) => setPresentacionId(e.target.value)}
              disabled={insumoId === "" || presentaciones.isPending}
              ayuda={
                equivalenteBase !== null
                  ? "Equivale a " +
                    equivalenteBase.toLocaleString("es-GT") +
                    " " +
                    (insumoElegido?.unidad_base_nombre ?? "unidades") +
                    "."
                  : "Deje en blanco para pedir en la unidad base."
              }
            >
              {presentaciones.data?.map((presentacion) => (
                <option key={presentacion.id} value={presentacion.id}>
                  {nombreUnidad(presentacion.unidad_medida_id)}
                  {!presentacion.es_default &&
                    " (× " +
                      Number(
                        presentacion.unidades_por_presentacion,
                      ).toLocaleString("es-GT") +
                      ")"}
                </option>
              ))}
            </CampoSelect>

            <CampoSelect
              etiqueta="Modalidad"
              value={modalidadId}
              onChange={(e) => {
                setModalidadId(e.target.value);
                setErrorLinea(undefined);
              }}
              ayuda="No se puede cambiar después de registrar la solicitud."
            >
              {modalidades.opciones.map((modalidad) => (
                <option key={modalidad.id} value={modalidad.id}>
                  {modalidad.nombre}
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

          {insumoElegido?.bloquea_solicitud_sin_stock &&
            (insumoElegido.stock_total > 0 ? (
              <Insignia tono="informativa">
                Este insumo exige stock disponible. Hay{" "}
                {insumoElegido.stock_total.toLocaleString("es-GT")}{" "}
                {insumoElegido.unidad_base_nombre} en existencia.
              </Insignia>
            ) : (
              <Insignia tono="rechazada">
                Sin existencias y este insumo exige stock: el sistema no dejará
                agregarlo. Anótelo en la lista de espera.
              </Insignia>
            ))}

          {formulariosExigidos.data && formulariosExigidos.data.length > 0 && (
            <Insignia tono="informativa">
              Con esta modalidad habrá que llenar{" "}
              {formulariosExigidos.data.length === 1
                ? "un formulario"
                : formulariosExigidos.data.length + " formularios"}{" "}
              antes de poder aprobar:{" "}
              {formulariosExigidos.data.map((f) => f.nombre).join(", ")}.
              Convendría llenarlos ahora, con la persona presente.
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
