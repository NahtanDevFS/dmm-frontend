import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { tonoDeEstadoSolicitud } from "../../componentes/ui/tonos";
import {
  CLAVE_SOLICITUDES,
  ESTADO_LINEA,
  type LineaSolicitudActiva,
} from "../../api/solicitudes";
import type { Programa } from "../../types/api";
import ModalSolicitud from "./ModalSolicitud";
import ModalFichaSolicitud from "./ModalFichaSolicitud";
import SeccionListaEspera from "./SeccionListaEspera";
import estilos from "./Solicitudes.module.css";

const VISTAS = [
  { id: "listado", etiqueta: "Solicitudes" },
  { id: "espera", etiqueta: "Lista de espera" },
] as const;

type Vista = (typeof VISTAS)[number]["id"];

/** Nombres legibles de estadoLinea, en el mismo orden que el desplegable. */
const OPCIONES_ESTADO: { valor: string; etiqueta: string }[] = [
  {
    valor: ESTADO_LINEA.PENDIENTE_ADQUISICION,
    etiqueta: "Pendiente de adquisición",
  },
  { valor: ESTADO_LINEA.PENDIENTE_ENTREGA, etiqueta: "Pendiente de entrega" },
  {
    valor: ESTADO_LINEA.PENDIENTE_ENTREGA_PARCIAL,
    etiqueta: "Pendiente de entrega (parcial)",
  },
  { valor: ESTADO_LINEA.APROBADA, etiqueta: "Aprobada" },
  { valor: ESTADO_LINEA.RECHAZADA, etiqueta: "Rechazada" },
];

/**
 * Solicitudes de apoyo.
 *
 * El listado viene de v_solicitudes_activas, que expone una fila por LÍNEA
 * (no por trámite): una solicitud con tres insumos aparece tres veces, cada
 * una con su propio estado, porque cada insumo avanza por su cuenta según su
 * stock. La cabecera completa —con todas sus líneas juntas— se ve en la
 * ficha, que se abre desde cualquiera de sus filas.
 */
function PaginaSolicitudes() {
  const navegar = useNavigate();
  const { id } = useParams();
  const rutaId = id && /^\d+$/.test(id) ? Number(id) : null;

  const [creando, setCreando] = useState(false);
  const [fichaId, setFichaId] = useState<number | null>(rutaId);
  const [vista, setVista] = useState<Vista>("listado");
  const [textoPersona, setTextoPersona] = useState("");
  const [programaId, setProgramaId] = useState("");
  const [estadoLinea, setEstadoLinea] = useState("");
  /**
   * Ver también lo ya entregado o cancelado. Apagado por omisión: la pantalla
   * se abre para trabajar sobre lo pendiente. Pero sin la opción, una
   * solicitud entregada desaparecía y no había forma de volver a su
   * expediente ni a sus documentos.
   */
  const [incluirCerradas, setIncluirCerradas] = useState(false);
  const [soloPendientesAprobacion, setSoloPendientesAprobacion] =
    useState(false);

  const programas = useCatalogo<Programa>("programas", {
    incluirInactivos: true,
  });

  // personaId no viaja al servidor: v_solicitudes_activas no expone ninguna
  // forma de filtrar por texto de nombre, solo por id (GET /solicitudes
  // solo acepta personaId numérico), y nadie escribe un id a mano. En vez de
  // forzar un buscador con selección formal solo para filtrar, el nombre se
  // compara aquí mismo contra las filas que ya trajo la página actual: es la
  // propia tabla la que hace de resultado de búsqueda.
  const filtros = useMemo(
    () => ({
      programaId: programaId || undefined,
      estadoLinea: estadoLinea || undefined,
      soloPendientesAprobacion: soloPendientesAprobacion ? "true" : undefined,
      incluirCerradas: incluirCerradas ? "true" : undefined,
    }),
    [programaId, estadoLinea, soloPendientesAprobacion, incluirCerradas],
  );

  const listado = useListadoPaginado<LineaSolicitudActiva>({
    clave: CLAVE_SOLICITUDES,
    ruta: "solicitudes",
    filtros,
  });

  const textoNormalizado = textoPersona.trim().toLowerCase();
  const filas = textoNormalizado
    ? listado.datos.filter((linea) =>
        linea.persona_nombre_completo.toLowerCase().includes(textoNormalizado),
      )
    : listado.datos;

  /** Devuelve la barra de direcciones al módulo si se entró por la ruta profunda. */
  const limpiarRuta = () => {
    if (rutaId !== null) navegar("/solicitudes", { replace: true });
  };

  const hayFiltros =
    textoPersona !== "" ||
    programaId !== "" ||
    estadoLinea !== "" ||
    soloPendientesAprobacion ||
    incluirCerradas;

  const limpiarFiltros = () => {
    setTextoPersona("");
    setProgramaId("");
    setEstadoLinea("");
    setSoloPendientesAprobacion(false);
    setIncluirCerradas(false);
  };

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <h1>Solicitudes de apoyo</h1>
          <p className={estilos.nota}>
            Cada fila es un insumo pedido dentro de un trámite. Un mismo trámite
            con varios insumos aparece en varias filas, porque cada uno avanza
            según su propio stock.
          </p>
        </div>
        <Boton variante="primaria" onClick={() => setCreando(true)}>
          Nueva solicitud
        </Boton>
      </header>

      <div className={estilos.selector} role="group" aria-label="Elegir vista">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={
              estilos.pildora +
              (vista === v.id ? " " + estilos.pildoraActiva : "")
            }
            aria-pressed={vista === v.id}
            onClick={() => setVista(v.id)}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>

      {vista === "espera" ? (
        <SeccionListaEspera onVerSolicitud={setFichaId} />
      ) : (
        <section className={estilos.tarjeta} aria-labelledby="sol-listado">
          <h2 id="sol-listado" className="solo-lectores">
            Solicitudes de apoyo
          </h2>

          <div className={estilos.filtros}>
            <CampoTexto
              className={estilos.filtroPersona}
              etiqueta="Persona"
              placeholder="Filtrar por nombre…"
              value={textoPersona}
              onChange={(e) => setTextoPersona(e.target.value)}
            />

            <CampoSelect
              className={estilos.filtroSelect}
              etiqueta="Programa"
              marcador="Todos los programas"
              value={programaId}
              onChange={(e) => setProgramaId(e.target.value)}
            >
              {programas.opciones.map((programa) => (
                <option key={programa.id} value={programa.id}>
                  {programa.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoSelect
              className={estilos.filtroSelect}
              etiqueta="Estado de la línea"
              marcador="Todos los estados"
              value={estadoLinea}
              onChange={(e) => setEstadoLinea(e.target.value)}
            >
              {OPCIONES_ESTADO.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </CampoSelect>

            <label className={estilos.opcionesExtra}>
              <input
                type="checkbox"
                className={estilos.casilla}
                checked={soloPendientesAprobacion}
                onChange={(e) => setSoloPendientesAprobacion(e.target.checked)}
              />
              Solo pendientes de aprobación
            </label>

            <label className={estilos.opcionesExtra}>
              <input
                type="checkbox"
                className={estilos.casilla}
                checked={incluirCerradas}
                onChange={(e) => setIncluirCerradas(e.target.checked)}
              />
              Incluir entregadas y canceladas
            </label>

            {hayFiltros && (
              <Boton
                variante="terciaria"
                className={estilos.limpiarFiltros}
                onClick={limpiarFiltros}
              >
                Limpiar filtros
              </Boton>
            )}
          </div>

          {listado.isPending ? (
            <EsqueletoTabla filas={5} columnas={6} />
          ) : listado.isError ? (
            <EstadoVacio
              titulo="No se pudo cargar el listado"
              texto={mensajeDeError(listado.error)}
              accion={
                <Boton
                  variante="secundaria"
                  onClick={() => void listado.refetch()}
                >
                  Reintentar
                </Boton>
              }
            />
          ) : filas.length === 0 ? (
            <EstadoVacio
              titulo="Sin solicitudes"
              texto={
                hayFiltros
                  ? "Ninguna línea coincide con los filtros aplicados."
                  : "Todavía no se ha registrado ninguna solicitud."
              }
            />
          ) : (
            <>
              {textoNormalizado && filas.length !== listado.datos.length && (
                <p className={estilos.auxiliar}>
                  Mostrando {filas.length} de {listado.datos.length} líneas de
                  esta página que coinciden con «{textoPersona.trim()}». El
                  filtro de persona no alcanza otras páginas; use Programa o
                  Estado para acotar la búsqueda en el servidor.
                </p>
              )}

              <Tabla titulo="Líneas de solicitud en curso">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Persona</th>
                    <th>Programa</th>
                    <th>Insumo</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((linea) => (
                    <tr key={linea.detalle_solicitud_id}>
                      <CeldaCantidad>
                        {formatearFecha(linea.fecha_solicitud)}
                      </CeldaCantidad>
                      <td className={estilos.persona}>
                        {linea.persona_nombre_completo}
                      </td>
                      <td>{linea.programa_nombre}</td>
                      <td>{linea.insumo_nombre}</td>
                      <CeldaCantidad>
                        {linea.cantidad_entregada.toLocaleString("es-GT")}
                        {" / "}
                        {linea.cantidad_requerida.toLocaleString("es-GT")}
                      </CeldaCantidad>
                      <td className={estilos.celdaEstado}>
                        <Insignia
                          tono={tonoDeEstadoSolicitud(linea.estado_linea)}
                        >
                          {OPCIONES_ESTADO.find(
                            (o) => o.valor === linea.estado_linea,
                          )?.etiqueta ?? linea.estado_linea}
                        </Insignia>
                        {linea.requiere_aprobacion && !linea.aprobada && (
                          <Insignia tono="informativa">
                            Requiere aprobación
                          </Insignia>
                        )}
                      </td>
                      <CeldaAcciones>
                        <Boton
                          pequeno
                          variante="secundaria"
                          onClick={() => setFichaId(linea.solicitud_id)}
                        >
                          Ver solicitud
                        </Boton>
                      </CeldaAcciones>
                    </tr>
                  ))}
                </tbody>
              </Tabla>

              <Paginacion
                total={listado.total}
                limite={listado.limite}
                desplazamiento={listado.desplazamiento}
                paginaActual={listado.paginaActual}
                totalPaginas={listado.totalPaginas}
                irAPagina={listado.irAPagina}
                anterior={listado.anterior}
                siguiente={listado.siguiente}
                cargando={listado.cambiandoPagina}
              />
            </>
          )}
        </section>
      )}

      {creando && (
        <ModalSolicitud
          abierto={creando}
          onCerrar={() => setCreando(false)}
          // Registrar el trámite y no poder abrirlo obligaría a buscarlo en
          // la tabla; lo que sigue después de crearlo es revisar sus líneas.
          onCreada={(solicitudId) => setFichaId(solicitudId)}
        />
      )}

      {fichaId !== null && (
        <ModalFichaSolicitud
          // La clave remonta la ficha al cambiar de solicitud: sin ella se
          // reutilizaría el estado del modal de la anterior.
          key={fichaId}
          solicitudId={fichaId}
          abierto
          onCerrar={() => {
            setFichaId(null);
            limpiarRuta();
          }}
        />
      )}
    </>
  );
}

export default PaginaSolicitudes;
