import { useMemo, useState } from "react";
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
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  listarStockInsumos,
  type StockInsumoListado,
} from "../../api/inventario";
import {
  CLAVE_ENTREGAS,
  obtenerEntrega,
  registrarEntrega,
} from "../../api/entregas";
import type { Persona, ElementoCatalogo } from "../../types/api";
import BuscadorPersona from "../solicitudes/BuscadorPersona";
import SeccionEvidencias from "./SeccionEvidencias";
import PreviaLotes from "./PreviaLotes";
import estilos from "./Entregas.module.css";

/**
 * Entrega directa: el camino de la medicina y la comida por donación directa.
 *
 * El flujo real que replica: la persona llega y pregunta si hay tal
 * medicamento, se revisa, se le pide la receta, se revisa, se le entrega, y
 * ahí mismo firma el formulario de papel. La receta y la foto del formulario
 * se suben en ese momento, con la persona todavía enfrente.
 *
 * Por eso el modal tiene dos pasos y NO se cierra al registrar: registrar y
 * documentar son un solo acto, y mandar al usuario a buscar la entrega en el
 * listado para adjuntar las fotos rompería justo el momento en que puede
 * hacerlo.
 *
 * Varios insumos en una sola entrega porque así lo indica la receta: si dice
 * acetaminofén y jarabe, la persona firma un solo renglón del formulario y se
 * toma una sola foto. Partirlo en dos entregas registraría dos actos donde
 * hubo uno.
 */
function ModalEntregaDirecta({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  // Paso 1: datos de la entrega. Paso 2: evidencias de la ya registrada.
  const [entregaRegistrada, setEntregaRegistrada] = useState<number | null>(
    null,
  );

  const [persona, setPersona] = useState<Persona | null>(null);
  const [receptor, setReceptor] = useState<Persona | null>(null);
  const [parentescoId, setParentescoId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Renglones ya agregados, y el que se está armando.
  const [renglones, setRenglones] = useState<
    { insumo: StockInsumoListado; cantidad: number }[]
  >([]);
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");

  const [borradorEvidencia, setBorradorEvidencia] = useState(false);

  const parentescos = useCatalogo<ElementoCatalogo>("tipos-parentesco");

  // La entrega recién creada, para que la sección de evidencias vea las que
  // se van subiendo. Solo consulta cuando ya existe.
  const registrada = useQuery({
    queryKey: [CLAVE_ENTREGAS, entregaRegistrada],
    queryFn: () => obtenerEntrega(entregaRegistrada!),
    enabled: entregaRegistrada !== null,
  });

  const stock = useQuery({
    queryKey: [CLAVE_INSUMOS, "stock"],
    queryFn: () => listarStockInsumos(),
  });

  /**
   * Insumos agrupados por categoría, con las existencias dentro de cada
   * opción. Una lista plana obliga a saber el nombre exacto de memoria; la
   * categoría es la pista que quien atiende sí tiene ("es una medicina"), y
   * el stock a la vista es lo que le permite contestar "sí hay" sin abrir
   * nada.
   */
  const porCategoria = useMemo(() => {
    const grupos = new Map<string, StockInsumoListado[]>();
    for (const fila of stock.data ?? []) {
      const lista = grupos.get(fila.categoria_nombre);
      if (lista) lista.push(fila);
      else grupos.set(fila.categoria_nombre, [fila]);
    }
    return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [stock.data]);

  const insumoElegido = stock.data?.find(
    (i) => i.insumo_id === Number(insumoId),
  );
  const cantidadNum = Number(cantidad);
  const cantidadValida = Number.isInteger(cantidadNum) && cantidadNum > 0;
  const yaAgregado = renglones.some(
    (r) => r.insumo.insumo_id === Number(insumoId),
  );

  function agregarRenglon() {
    if (!insumoElegido || !cantidadValida || yaAgregado) return;
    setRenglones((previos) => [
      ...previos,
      { insumo: insumoElegido, cantidad: cantidadNum },
    ]);
    setInsumoId("");
    setCantidad("");
  }

  const hayCambios =
    persona !== null ||
    renglones.length > 0 ||
    insumoId !== "" ||
    cantidad !== "" ||
    receptor !== null ||
    observaciones.trim() !== "";

  const cerrar = useCierreSeguro({
    // Ya registrada, lo único que se puede perder es una evidencia a medias.
    hayCambios: entregaRegistrada !== null ? borradorEvidencia : hayCambios,
    onCerrar,
    mensaje:
      entregaRegistrada !== null
        ? "Hay una evidencia a medio adjuntar. Si cierra ahora se pierde lo escrito; la entrega ya quedó registrada."
        : "Hay una entrega a medio registrar. Si cierra ahora, se pierde lo escrito y no queda nada guardado.",
  });

  const mutacion = useMutation({
    mutationFn: () =>
      registrarEntrega({
        persona_id: persona!.id,
        // Sin detalle_solicitud_id: es el punto entero de esta pantalla, no
        // hay solicitud detrás porque no hay nada que aprobar.
        insumos: renglones.map((r) => ({
          insumo_id: r.insumo.insumo_id,
          cantidad: r.cantidad,
        })),
        persona_receptor_id: receptor?.id ?? null,
        tipo_parentesco_receptor_id: receptor
          ? Number(parentescoId) || null
          : null,
        observaciones: observaciones.trim() || null,
      }),
    onSuccess: async (entrega) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_ENTREGAS] });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_INSUMOS] });
      setEntregaRegistrada(entrega.id);
    },
    // Incluye el rechazo por stock insuficiente: la base ya redacta el
    // mensaje en español con las cantidades exactas.
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const receptorValido = !receptor || parentescoId !== "";
  const listoParaEnviar =
    persona !== null && renglones.length > 0 && receptorValido;

  // ── Paso 2: la entrega ya existe, faltan las fotos ──────────────────────
  if (entregaRegistrada !== null) {
    return (
      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Adjunte la receta y el formulario firmado"
        descripcion="La entrega ya quedó registrada. Esto es la constancia."
        tamano="amplio"
        pie={
          <GrupoBotones>
            <Boton variante="primaria" onClick={cerrar}>
              Terminar
            </Boton>
          </GrupoBotones>
        }
      >
        <Insignia tono="aprobada">
          Entrega registrada. El inventario ya se descontó: no vuelva a
          registrarla aunque cierre esta ventana.
        </Insignia>

        <div className={estilos.listaLotes}>
          <div className={estilos.lote}>
            <span className={estilos.loteCodigo}>
              {persona!.nombres} {persona!.apellidos}
            </span>
            <span className={estilos.auxiliar}>
              {renglones
                .map(
                  (r) =>
                    r.insumo.insumo_nombre +
                    " · " +
                    r.cantidad.toLocaleString("es-GT") +
                    " " +
                    r.insumo.unidad_base_nombre,
                )
                .join(" | ")}
            </span>
          </div>
        </div>
        <p className={estilos.nota}>
          Confirme que coincide con lo que escribió en el formulario de papel
          antes de tomar la foto.
        </p>

        <SeccionEvidencias
          entregaId={entregaRegistrada}
          evidencias={registrada.data?.evidencias ?? []}
          onBorrador={setBorradorEvidencia}
        />
      </Modal>
    );
  }

  // ── Paso 1: registrar ──────────────────────────────────────────────────
  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Registrar entrega directa"
      descripcion="Para medicina y comida por donación directa, que no pasan por solicitud."
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
      <Insignia tono="informativa">
        El equipo (sillas de ruedas, muletas) no se entrega por aquí: requiere
        solicitud, formularios y aprobación de Dirección.
      </Insignia>

      <BuscadorPersona
        etiqueta="Persona beneficiaria"
        personaElegida={persona}
        onElegir={setPersona}
        obligatorio
        flotante={false}
      />

      <div className={estilos.rejillaLote}>
        <CampoSelect
          etiqueta="Insumo"
          value={insumoId}
          onChange={(e) => setInsumoId(e.target.value)}
          disabled={stock.isPending}
          ayuda={
            stock.isError
              ? "No se pudo cargar el inventario. Cierre y vuelva a intentarlo."
              : "Agrupado por categoría, con las existencias de hoy."
          }
        >
          {porCategoria.map(([categoria, lista]) => (
            <optgroup key={categoria} label={categoria}>
              {lista.map((insumo) => (
                <option
                  key={insumo.insumo_id}
                  value={insumo.insumo_id}
                  disabled={insumo.stock_total === 0}
                >
                  {insumo.insumo_nombre}
                  {" — "}
                  {insumo.stock_total === 0
                    ? "sin existencias"
                    : insumo.stock_total.toLocaleString("es-GT") +
                      " " +
                      insumo.unidad_base_nombre}
                </option>
              ))}
            </optgroup>
          ))}
        </CampoSelect>

        <CampoTexto
          etiqueta="Cantidad"
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          error={
            cantidad !== "" && !cantidadValida
              ? "Debe ser un número entero mayor que cero."
              : undefined
          }
        />

        <div className={estilos.accionLote}>
          <Boton
            variante="secundaria"
            disabled={!insumoElegido || !cantidadValida || yaAgregado}
            onClick={agregarRenglon}
          >
            Agregar insumo
          </Boton>
        </div>
      </div>

      {yaAgregado && (
        <p className={estilos.auxiliar}>
          Ese insumo ya está en la lista. Quítelo y agréguelo de nuevo si
          necesita cambiar la cantidad.
        </p>
      )}

      {insumoElegido && cantidadValida && !yaAgregado && (
        <PreviaLotes
          insumoId={insumoElegido.insumo_id}
          cantidadPedida={cantidadNum}
        />
      )}

      {renglones.length > 0 && (
        <div className={estilos.listaLotes}>
          {renglones.map((renglon) => (
            <div key={renglon.insumo.insumo_id} className={estilos.lote}>
              <div>
                <p className={estilos.loteCodigo}>
                  {renglon.insumo.insumo_nombre}
                </p>
                <p className={estilos.auxiliar}>
                  {renglon.cantidad.toLocaleString("es-GT")}{" "}
                  {renglon.insumo.unidad_base_nombre}
                  {renglon.cantidad > renglon.insumo.stock_total &&
                    " · excede las existencias"}
                </p>
              </div>
              <Boton
                pequeno
                variante="terciaria"
                onClick={() =>
                  setRenglones((previos) =>
                    previos.filter(
                      (r) => r.insumo.insumo_id !== renglon.insumo.insumo_id,
                    ),
                  )
                }
              >
                Quitar
              </Boton>
            </div>
          ))}
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
    </Modal>
  );
}

export default ModalEntregaDirecta;
