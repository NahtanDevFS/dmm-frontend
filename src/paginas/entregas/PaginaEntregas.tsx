import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { formatearFecha, fechaDeHoy } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { CLAVE_ENTREGAS, type EntregaListado } from "../../api/entregas";
import ModalEntregaDirecta from "./ModalEntregaDirecta";
import ModalFichaEntrega from "./ModalFichaEntrega";
import estilos from "./Entregas.module.css";

/**
 * Entregas: el despacho real de insumos, por cualquiera de los dos caminos.
 *
 * El despacho de equipo NO se da de alta aquí: vive en la ficha de la
 * solicitud (Ver solicitud → Insumos solicitados → Despachar), porque
 * necesita elegir primero QUÉ línea pendiente se está despachando y ese
 * contexto solo existe allá.
 *
 * La entrega directa de medicina y comida sí nace aquí, porque no tiene
 * solicitud de la cual colgarse: la persona llega, hay existencias y se le
 * entrega. El modal no se cierra al registrar — encadena con la carga de la
 * receta y el formulario firmado, que es el mismo acto.
 */
function PaginaEntregas() {
  const navegar = useNavigate();
  const { id } = useParams();
  const rutaId = id && /^\d+$/.test(id) ? Number(id) : null;

  const [fichaId, setFichaId] = useState<number | null>(rutaId);
  const [entregaDirecta, setEntregaDirecta] = useState(false);
  const [textoPersona, setTextoPersona] = useState("");
  const [textoInsumo, setTextoInsumo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);

  // El filtro de persona es client-side, igual que en Solicitudes: el
  // listado no tiene vista propia por nombre, solo por id (que nadie tiene a
  // mano). El de insumo sí se manda al servidor porque listarEntregas ya
  // filtra por insumoId exacto vía EXISTS -- pero ese id tampoco lo escribe
  // nadie a mano, así que aquí también se filtra sobre lo ya traído.
  const filtros = useMemo(
    () => ({
      desde: desde || undefined,
      hasta: hasta || undefined,
      incluirAnuladas: incluirAnuladas ? "true" : undefined,
    }),
    [desde, hasta, incluirAnuladas],
  );

  const listado = useListadoPaginado<EntregaListado>({
    clave: CLAVE_ENTREGAS,
    ruta: "entregas",
    filtros,
  });

  const textoPersonaNorm = textoPersona.trim().toLowerCase();
  const textoInsumoNorm = textoInsumo.trim().toLowerCase();
  const filas = listado.datos.filter((entrega) => {
    const coincidePersona =
      !textoPersonaNorm ||
      entrega.persona_nombre_completo.toLowerCase().includes(textoPersonaNorm);
    const coincideInsumo =
      !textoInsumoNorm ||
      entrega.insumos.toLowerCase().includes(textoInsumoNorm);
    return coincidePersona && coincideInsumo;
  });

  /** Devuelve la barra de direcciones al módulo si se entró por la ruta profunda. */
  const limpiarRuta = () => {
    if (rutaId !== null) navegar("/entregas", { replace: true });
  };

  const hayFiltros =
    textoPersona !== "" ||
    textoInsumo !== "" ||
    desde !== "" ||
    hasta !== "" ||
    incluirAnuladas;

  const limpiarFiltros = () => {
    setTextoPersona("");
    setTextoInsumo("");
    setDesde("");
    setHasta("");
    setIncluirAnuladas(false);
  };

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <h1>Entregas</h1>
          <p className={estilos.nota}>
            La medicina y la comida se entregan directo, sin solicitud. El
            equipo se despacha desde su solicitud aprobada, con «Despachar».
          </p>
        </div>

        <Boton variante="primaria" onClick={() => setEntregaDirecta(true)}>
          Registrar entrega directa
        </Boton>
      </header>

      <section className={estilos.tarjeta} aria-labelledby="ent-listado">
        <h2 id="ent-listado" className="solo-lectores">
          Entregas
        </h2>

        <div className={estilos.filtros}>
          <CampoTexto
            className={estilos.filtroAncho}
            etiqueta="Persona"
            placeholder="Filtrar por nombre…"
            value={textoPersona}
            onChange={(e) => setTextoPersona(e.target.value)}
          />

          <CampoTexto
            className={estilos.filtroAncho}
            etiqueta="Insumo"
            placeholder="Filtrar por insumo…"
            value={textoInsumo}
            onChange={(e) => setTextoInsumo(e.target.value)}
          />

          <CampoTexto
            etiqueta="Desde"
            type="date"
            max={hasta || fechaDeHoy()}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />

          <CampoTexto
            etiqueta="Hasta"
            type="date"
            min={desde || undefined}
            max={fechaDeHoy()}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />

          <label className={estilos.opcionesExtra}>
            <input
              type="checkbox"
              className={estilos.casilla}
              checked={incluirAnuladas}
              onChange={(e) => setIncluirAnuladas(e.target.checked)}
            />
            Incluir anuladas
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
            titulo="Sin entregas"
            texto={
              hayFiltros
                ? "Ninguna entrega coincide con los filtros aplicados."
                : "Todavía no se ha registrado ninguna entrega."
            }
          />
        ) : (
          <>
            <Tabla titulo="Entregas registradas">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Persona</th>
                  <th>Recibió</th>
                  <th>Insumos</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((entrega) => (
                  <tr key={entrega.id}>
                    <CeldaCantidad>
                      {formatearFecha(entrega.fecha_entrega)}
                    </CeldaCantidad>
                    <td className={estilos.persona}>
                      {entrega.persona_nombre_completo}
                    </td>
                    <td>
                      {entrega.receptor_nombre_completo
                        ? entrega.receptor_nombre_completo +
                          (entrega.parentesco_receptor
                            ? " (" + entrega.parentesco_receptor + ")"
                            : "")
                        : "La misma persona"}
                    </td>
                    <td>{entrega.insumos || "—"}</td>
                    <CeldaCantidad>
                      {entrega.total_entregado.toLocaleString("es-GT")}
                    </CeldaCantidad>
                    <td>
                      {entrega.activo ? (
                        <Insignia tono="aprobada">Vigente</Insignia>
                      ) : (
                        <Insignia tono="rechazada">Anulada</Insignia>
                      )}
                    </td>
                    <CeldaAcciones>
                      <Boton
                        pequeno
                        variante="secundaria"
                        onClick={() => setFichaId(entrega.id)}
                      >
                        Ver entrega
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

      {entregaDirecta && (
        <ModalEntregaDirecta
          abierto
          onCerrar={() => setEntregaDirecta(false)}
        />
      )}

      {fichaId !== null && (
        <ModalFichaEntrega
          key={fichaId}
          entregaId={fichaId}
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

export default PaginaEntregas;
