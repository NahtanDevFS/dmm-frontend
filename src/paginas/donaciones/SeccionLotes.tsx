import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
  CeldaIdentificador,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { fechaDeHoy, formatearFecha } from "../../lib/fechas";
import { errorDeCampo, mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  listarInsumosParaSeleccion,
  listarPresentaciones,
  type Insumo,
} from "../../api/inventario";
import {
  CLAVE_RECEPCIONES,
  crearLote,
  listarLotes,
  type LoteRecepcion,
} from "../../api/donaciones";
import ModalBajaLote from "../inventario/ModalBajaLote";
import type { ElementoCatalogo } from "../../types/api";
import { calcularUnidadesBase } from "./calculo";
import { contarEnEsperaDe } from "./listaEspera";
import estilos from "./Donaciones.module.css";

const VACIO = {
  insumo_id: "",
  presentacion_recepcion_id: "",
  cantidad_recepcion_original: "",
  unidades_por_presentacion_lote: "",
  marca_id: "",
  codigo_lote_fabricante: "",
  fecha_caducidad: "",
  observaciones: "",
};

/**
 * Lotes de inventario de una recepción: lo que trajo el envío.
 *
 * Cada lote es un insumo concreto en una presentación concreta. Un mismo envío
 * puede traer el mismo insumo en dos lotes distintos —con caducidades
 * distintas— y son dos filas, porque lo que vence es el lote.
 */
function SeccionLotes({
  recepcionId,
  recepcionActiva,
}: {
  recepcionId: number;
  recepcionActiva: boolean;
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  /** Efecto del último lote sobre la lista de espera, si se pudo medir. */
  const [promocion, setPromocion] = useState<{
    insumo: string;
    lineas: number;
  } | null>(null);

  const [dandoBaja, setDandoBaja] = useState<LoteRecepcion | null>(null);

  /**
   * Los lotes se piden aquí, con los dados de baja incluidos, en vez de usar
   * los que trae GET /recepciones/:id —que los omite—. Un lote descartado
   * sigue siendo parte de lo que pasó con el envío: si desapareciera al darlo
   * de baja, quien corrigió un renglón mal capturado no tendría forma de
   * comprobar que la corrección quedó registrada.
   */
  const consulta = useQuery({
    queryKey: [CLAVE_RECEPCIONES, recepcionId, "lotes"],
    queryFn: () => listarLotes(recepcionId, true),
  });
  const lotes = consulta.data ?? [];

  const insumos = useQuery({
    queryKey: [CLAVE_INSUMOS, "seleccion"],
    queryFn: listarInsumosParaSeleccion,
  });

  const insumoId = Number(datos.insumo_id);
  const insumo: Insumo | undefined = insumos.data?.find(
    (i) => i.id === insumoId,
  );

  const presentaciones = useQuery({
    queryKey: [CLAVE_INSUMOS, insumoId, "presentaciones"],
    queryFn: () => listarPresentaciones(insumoId),
    enabled: Number.isInteger(insumoId) && insumoId > 0,
  });

  const marcas = useCatalogo<ElementoCatalogo>("marcas-insumo");
  const unidades = useCatalogo<ElementoCatalogo>("unidades-medida", {
    incluirInactivos: true,
  });

  /**
   * Presentación efectiva: la elegida, o la predeterminada del insumo mientras
   * nadie elija otra. Es la que la DMM usa habitualmente para ese producto, y
   * proponerla ahorra un clic por cada renglón del camión.
   *
   * Se deriva en vez de copiarse al estado desde un efecto. Duplicar en
   * useState un valor que ya vive en la query encadena renders y, además, deja
   * el select en blanco durante el primer pintado; derivarlo no tiene ninguno
   * de los dos problemas.
   */
  const presentacionPorDefecto = presentaciones.data?.find((p) => p.es_default);
  const presentacionElegida =
    datos.presentacion_recepcion_id ||
    (presentacionPorDefecto ? String(presentacionPorDefecto.id) : "");

  const cambiar =
    (campo: keyof typeof datos) =>
    (
      evento: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setDatos((previos) => ({ ...previos, [campo]: evento.target.value }));

  // Cambiar de insumo invalida la presentación: pertenecen a otro producto y
  // la base rechaza la combinación con un mensaje que no ayuda a nadie.
  const cambiarInsumo = (valor: string) =>
    setDatos((previos) => ({
      ...previos,
      insumo_id: valor,
      presentacion_recepcion_id: "",
    }));

  const cantidad = Number(datos.cantidad_recepcion_original);
  const porPresentacion = Number(datos.unidades_por_presentacion_lote);
  const unidadesBase = calcularUnidadesBase(cantidad, porPresentacion);
  const hayCalculo =
    datos.cantidad_recepcion_original !== "" &&
    datos.unidades_por_presentacion_lote !== "" &&
    Number.isFinite(unidadesBase);

  const nombreUnidad = (id: number | undefined) =>
    unidades.opciones.find((u) => u.id === id)?.nombre ?? "unidad base";

  const alta = useMutation({
    /**
     * Registrar el lote y medir a cuántas personas destrabó.
     *
     * El backend llama a sp_procesar_donacion_pendientes dentro de la misma
     * transacción que crea el lote, pero la respuesta del POST solo devuelve el
     * lote: no dice cuántas líneas de solicitud pasaron de esperar existencias
     * a estar listas para entrega. Se deduce contando la lista de espera de ese
     * insumo antes y después.
     *
     * Los dos conteos son opcionales y no pueden hacer fallar el alta: si
     * alguno no llega, el lote está registrado igual y lo único que se pierde
     * es el aviso.
     */
    mutationFn: async () => {
      const nombre = insumo?.nombre;
      const antes = nombre ? await contarEnEsperaDe(nombre) : null;

      const lote = await crearLote(recepcionId, {
        insumo_id: Number(datos.insumo_id),
        presentacion_recepcion_id: Number(presentacionElegida),
        cantidad_recepcion_original: cantidad,
        unidades_por_presentacion_lote: porPresentacion,
        marca_id: datos.marca_id ? Number(datos.marca_id) : null,
        codigo_lote_fabricante: datos.codigo_lote_fabricante.trim() || null,
        fecha_caducidad: datos.fecha_caducidad || null,
        observaciones: datos.observaciones.trim() || null,
      });

      const despues = nombre ? await contarEnEsperaDe(nombre) : null;
      const promovidas =
        antes !== null && despues !== null ? Math.max(0, antes - despues) : 0;

      return { lote, promovidas, insumoNombre: nombre ?? "" };
    },
    onSuccess: async ({ promovidas, insumoNombre }) => {
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_RECEPCIONES, recepcionId],
      });
      // El stock del insumo cambió: la ficha del inventario y el semáforo
      // mostrarían existencias viejas si no se invalidaran también.
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_INSUMOS] });
      avisar("Lote agregado al inventario.", "exito");
      setPromocion(
        promovidas > 0 ? { insumo: insumoNombre, lineas: promovidas } : null,
      );
      setDatos(VACIO);
      setErrores({});
    },
    onError: (error) => {
      setErrores({
        cantidad_recepcion_original: errorDeCampo(
          error,
          "cantidad_recepcion_original",
        ),
        unidades_por_presentacion_lote: errorDeCampo(
          error,
          "unidades_por_presentacion_lote",
        ),
        codigo_lote_fabricante: errorDeCampo(error, "codigo_lote_fabricante"),
        fecha_caducidad: errorDeCampo(error, "fecha_caducidad"),
      });
      avisar(mensajeDeError(error), "error");
    },
  });

  const completo =
    datos.insumo_id !== "" &&
    presentacionElegida !== "" &&
    cantidad > 0 &&
    porPresentacion > 0 &&
    (!insumo?.requiere_fecha_caducidad || datos.fecha_caducidad !== "") &&
    (!insumo?.requiere_codigo_fabricante ||
      datos.codigo_lote_fabricante.trim() !== "");

  const nombreInsumo = (id: number) =>
    insumos.data?.find((i) => i.id === id)?.nombre ?? "—";

  /**
   * Resumen de lo que se va a guardar, para confirmarlo antes de registrar.
   *
   * Enseña el **resultado** y no lo tecleado. El campo calculado del
   * formulario ya muestra la cantidad final, pero se lee de pasada mientras se
   * escribe; el error que motiva todo esto —transponer dígitos, 2.5 donde iban
   * 25— solo se ve al leer el total en unidad base, y para eso hay que
   * detenerse. Un lote mal registrado no se puede editar: la única salida es
   * darlo de baja y volver a capturarlo, así que el momento de mirar es este.
   */
  const resumenParaConfirmar = () => {
    const presentacion = presentaciones.data?.find(
      (p) => String(p.id) === presentacionElegida,
    );
    const unidadBase = nombreUnidad(insumo?.unidad_medida_base_id);
    const lineas = [
      "Insumo: " + (insumo?.nombre ?? "—"),
      "Presentación: " +
        (presentacion ? nombreUnidad(presentacion.unidad_medida_id) : "—"),
      "Entra al inventario: " +
        unidadesBase.toLocaleString("es-GT") +
        " " +
        unidadBase +
        "  (" +
        cantidad.toLocaleString("es-GT", { maximumFractionDigits: 4 }) +
        " × " +
        porPresentacion.toLocaleString("es-GT", { maximumFractionDigits: 4 }) +
        ")",
      "Caducidad: " +
        (datos.fecha_caducidad
          ? formatearFecha(datos.fecha_caducidad)
          : "sin fecha"),
      "Código de fabricante: " +
        (datos.codigo_lote_fabricante.trim() || "sin código"),
    ];

    // El truncamiento se dice aparte y con todas las letras: es la única parte
    // del cálculo que hace desaparecer producto sin dejar rastro después.
    if (unidadesBase !== cantidad * porPresentacion) {
      lineas.push(
        "",
        "Se pierde la fracción: " +
          (cantidad * porPresentacion).toLocaleString("es-GT", {
            maximumFractionDigits: 4,
          }) +
          " se trunca a " +
          unidadesBase.toLocaleString("es-GT") +
          " " +
          unidadBase +
          ".",
      );
    }

    return lineas.join("\n");
  };

  const confirmarYRegistrar = async () => {
    const ok = await confirmar({
      titulo: "Registrar este lote",
      mensaje: resumenParaConfirmar(),
      textoConfirmar: "Registrar lote",
    });
    if (ok) alta.mutate();
  };

  const unidadBaseDe = (id: number) =>
    nombreUnidad(insumos.data?.find((i) => i.id === id)?.unidad_medida_base_id);

  return (
    <section className={estilos.tarjeta} aria-labelledby="don-lotes">
      <div className={estilos.tituloTarjeta}>
        <h2 id="don-lotes">Lotes recibidos</h2>
      </div>

      <p className={estilos.nota}>
        Cada lote es un insumo en una presentación. El mismo insumo puede venir
        en dos lotes con caducidades distintas: son dos renglones, porque lo que
        vence es el lote.
      </p>

      {consulta.isPending ? (
        <EsqueletoTabla filas={3} columnas={6} />
      ) : consulta.isError ? (
        <EstadoVacio
          titulo="No se pudieron cargar los lotes"
          texto={mensajeDeError(consulta.error)}
        />
      ) : lotes.length === 0 ? (
        <EstadoVacio
          titulo="Sin lotes"
          texto={
            recepcionActiva
              ? "Registre abajo lo que trajo el envío."
              : "Esta recepción no llegó a registrar ningún lote."
          }
        />
      ) : (
        <Tabla titulo="Lotes de la recepción">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Recibido</th>
              <th>En unidad base</th>
              <th>Disponible</th>
              <th>Caducidad</th>
              <th>Código de fabricante</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => (
              <tr key={lote.id}>
                <td>{nombreInsumo(lote.insumo_id)}</td>
                <CeldaCantidad>
                  {Number(lote.cantidad_recepcion_original).toLocaleString(
                    "es-GT",
                    { maximumFractionDigits: 4 },
                  )}
                  {" × "}
                  {Number(lote.unidades_por_presentacion_lote).toLocaleString(
                    "es-GT",
                    { maximumFractionDigits: 4 },
                  )}
                </CeldaCantidad>
                <CeldaCantidad>
                  {lote.cantidad_inicial.toLocaleString("es-GT")}{" "}
                  <span className={estilos.auxiliar}>
                    {unidadBaseDe(lote.insumo_id)}
                  </span>
                </CeldaCantidad>
                <CeldaCantidad>
                  {lote.cantidad_disponible.toLocaleString("es-GT")}
                  {lote.activo ? null : (
                    <>
                      {" "}
                      <Insignia tono="neutra">De baja</Insignia>
                    </>
                  )}
                </CeldaCantidad>
                <td>{formatearFecha(lote.fecha_caducidad)}</td>
                <CeldaIdentificador>
                  {lote.codigo_lote_fabricante ?? "—"}
                </CeldaIdentificador>
                <CeldaAcciones>
                  {lote.activo ? (
                    <Boton
                      pequeno
                      variante="terciaria"
                      onClick={() => setDandoBaja(lote)}
                    >
                      Dar de baja
                    </Boton>
                  ) : (
                    <span className={estilos.auxiliar}>Descartado</span>
                  )}
                </CeldaAcciones>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      {promocion && (
        /*
          role="status" y no "alert": es una buena noticia que puede esperar al
          hueco natural del lector de pantalla, no una interrupción.
        */
        <div className={estilos.promocion} role="status">
          <div>
            <p className={estilos.promocionTitulo}>
              {promocion.lineas === 1
                ? "Una solicitud en espera quedó lista para entrega"
                : promocion.lineas +
                  " solicitudes en espera quedaron listas para entrega"}
            </p>
            <p className={estilos.promocionTexto}>
              Al entrar «{promocion.insumo}» al inventario, la base resolvió la
              lista de espera por orden de llegada y pasó esas líneas de
              «pendiente de adquisición» a «pendiente de entrega». Todavía hay
              que despacharlas desde Entregas: aquí solo quedaron reservadas.
            </p>
          </div>
          <Boton
            pequeno
            variante="terciaria"
            onClick={() => setPromocion(null)}
          >
            Entendido
          </Boton>
        </div>
      )}

      {!recepcionActiva ? (
        <p className={estilos.auxiliar} style={{ marginTop: "var(--space-2)" }}>
          Una recepción desactivada no admite lotes nuevos. Reactívela para
          seguir registrando.
        </p>
      ) : (
        <div className={estilos.formularioLote}>
          <h3 className={estilos.tituloFormulario}>Agregar un lote</h3>

          <div className={estilos.rejillaLote}>
            <CampoSelect
              etiqueta="Insumo"
              obligatorio
              value={datos.insumo_id}
              onChange={(e) => cambiarInsumo(e.target.value)}
              ayuda={
                insumo
                  ? "Sus requisitos marcan qué campos son obligatorios abajo."
                  : "Solo aparecen los insumos activos del catálogo."
              }
            >
              {(insumos.data ?? []).map((elemento) => (
                <option key={elemento.id} value={elemento.id}>
                  {elemento.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoSelect
              etiqueta="Presentación recibida"
              obligatorio
              value={presentacionElegida}
              disabled={datos.insumo_id === ""}
              onChange={cambiar("presentacion_recepcion_id")}
              marcador={
                datos.insumo_id === ""
                  ? "Elija primero el insumo"
                  : "Seleccione la presentación"
              }
              ayuda="La forma en que llegó: caja, bolsa, quintal."
            >
              {(presentaciones.data ?? []).map((presentacion) => (
                <option key={presentacion.id} value={presentacion.id}>
                  {nombreUnidad(presentacion.unidad_medida_id)}
                  {presentacion.es_default ? " (predeterminada)" : ""}
                </option>
              ))}
            </CampoSelect>

            <CampoTexto
              etiqueta="Cantidad recibida"
              type="number"
              min="0"
              step="0.0001"
              obligatorio
              numerico
              value={datos.cantidad_recepcion_original}
              onChange={cambiar("cantidad_recepcion_original")}
              error={errores.cantidad_recepcion_original}
              ayuda="Cuántas presentaciones llegaron: 3 cajas, 5 bolsas."
            />

            <CampoTexto
              etiqueta="Unidades por presentación"
              type="number"
              min="0"
              step="0.0001"
              obligatorio
              numerico
              value={datos.unidades_por_presentacion_lote}
              onChange={cambiar("unidades_por_presentacion_lote")}
              error={errores.unidades_por_presentacion_lote}
              ayuda="Cuántas unidades base trae cada una. Es de este lote: otro envío puede traer cajas distintas."
            />

            {/*
              Previsualización, no un campo. El valor que se guarda lo calcula
              la base con trg_calcular_recepcion_lote; esto solo enseña el
              resultado antes de confirmar, y sobre todo enseña el truncamiento:
              2.5 cajas de 3 unidades entran como 7, no como 7.5, y esa media
              unidad no reaparece en ningún informe posterior.
            */}
            <CampoTexto
              etiqueta={"Entrará al inventario como"}
              calculado
              numerico
              value={
                hayCalculo
                  ? unidadesBase.toLocaleString("es-GT") +
                    " " +
                    nombreUnidad(insumo?.unidad_medida_base_id)
                  : ""
              }
              readOnly
              ayuda={
                hayCalculo && unidadesBase !== cantidad * porPresentacion
                  ? "Se trunca hacia abajo: la fracción sobrante no entra al inventario."
                  : "Lo calcula la base al guardar. Aquí solo se previsualiza."
              }
            />

            <CampoSelect
              etiqueta="Marca"
              value={datos.marca_id}
              onChange={cambiar("marca_id")}
              marcador="Sin marca"
            >
              {marcas.opciones.map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoTexto
              etiqueta="Código de lote del fabricante"
              identificador
              maxLength={100}
              obligatorio={insumo?.requiere_codigo_fabricante}
              value={datos.codigo_lote_fabricante}
              onChange={cambiar("codigo_lote_fabricante")}
              error={errores.codigo_lote_fabricante}
              ayuda={
                insumo?.requiere_codigo_fabricante
                  ? "Este insumo lo exige: la base rechaza el lote sin él."
                  : "Opcional para este insumo."
              }
            />

            <CampoTexto
              etiqueta="Fecha de caducidad"
              type="date"
              min={fechaDeHoy()}
              obligatorio={insumo?.requiere_fecha_caducidad}
              value={datos.fecha_caducidad}
              onChange={cambiar("fecha_caducidad")}
              error={errores.fecha_caducidad}
              ayuda={
                insumo?.requiere_fecha_caducidad
                  ? "Este insumo la exige: la base rechaza el lote sin ella."
                  : "Opcional. Sin fecha, el lote queda «sin caducidad» en el semáforo."
              }
            />

            <CampoAreaTexto
              className={estilos.anchoCompleto}
              etiqueta="Observaciones del lote"
              rows={2}
              maxLength={2000}
              value={datos.observaciones}
              onChange={cambiar("observaciones")}
            />
          </div>

          <div className={estilos.accionLote}>
            <Boton
              variante="secundaria"
              disabled={!completo}
              cargando={alta.isPending}
              textoCargando="Registrando…"
              onClick={confirmarYRegistrar}
            >
              Agregar lote
            </Boton>
          </div>
        </div>
      )}
      {dandoBaja && (
        <ModalBajaLote
          lote={{
            id: dandoBaja.id,
            insumoNombre: nombreInsumo(dandoBaja.insumo_id),
            codigo: dandoBaja.codigo_lote_fabricante,
            fechaCaducidad: dandoBaja.fecha_caducidad,
            cantidadDisponible: dandoBaja.cantidad_disponible,
          }}
          abierto
          onCerrar={() => setDandoBaja(null)}
        />
      )}
    </section>
  );
}

export default SeccionLotes;
