import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
  CeldaIdentificador,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { CLAVE_RECEPCIONES, type Recepcion } from "../../api/donaciones";
import type { InstitucionDonante } from "../../types/api";
import ModalRecepcion from "./ModalRecepcion";
import ModalFichaRecepcion from "./ModalFichaRecepcion";
import estilos from "./Donaciones.module.css";

/**
 * Recepciones de donación.
 *
 * Una recepción es un envío: una institución, una fecha y el código con que
 * ella identifica la entrega. Lo que llegó dentro son sus lotes, y viven en la
 * ficha, no aquí: un mismo envío puede traer diez insumos distintos y la tabla
 * de cabeceras dejaría de leerse si intentara mostrarlos.
 */
function PaginaDonaciones() {
  const navegar = useNavigate();
  const { id } = useParams();
  const rutaId = id && /^\d+$/.test(id) ? Number(id) : null;

  const [creando, setCreando] = useState(false);
  const [fichaId, setFichaId] = useState<number | null>(rutaId);
  const [institucionId, setInstitucionId] = useState("");
  const [incluirInactivas, setIncluirInactivas] = useState(false);

  /** Con inactivas: una recepción puede apuntar a una institución dada de baja. */
  const instituciones = useCatalogo<InstitucionDonante>(
    "instituciones-donantes",
    { incluirInactivos: true },
  );

  const filtros = useMemo(
    () => ({
      institucionId: institucionId || undefined,
      incluirInactivas: incluirInactivas ? "true" : undefined,
    }),
    [institucionId, incluirInactivas],
  );

  const listado = useListadoPaginado<Recepcion>({
    clave: CLAVE_RECEPCIONES,
    ruta: "recepciones",
    filtros,
  });

  const nombreInstitucion = (idInstitucion: number) =>
    instituciones.opciones.find((i) => i.id === idInstitucion)?.nombre ?? "—";

  /** Devuelve la barra de direcciones al módulo si se entró por la ruta profunda. */
  const limpiarRuta = () => {
    if (rutaId !== null) navegar("/donaciones", { replace: true });
  };

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <h1>Ingreso de lotes</h1>
          <p className={estilos.nota}>
            Cada ingreso es un envío recibido de una institución donante. Los
            insumos que trajo se registran dentro, como lotes de inventario.
          </p>
        </div>
        <Boton variante="primaria" onClick={() => setCreando(true)}>
          Nueva recepción
        </Boton>
      </header>

      <section className={estilos.tarjeta} aria-labelledby="don-listado">
        <h2 id="don-listado" className="solo-lectores">
          Recepciones de donación
        </h2>

        <div className={estilos.filtros}>
          <CampoSelect
            className={estilos.filtroSelect}
            etiqueta="Institución donante"
            marcador="Todas las instituciones"
            value={institucionId}
            onChange={(e) => setInstitucionId(e.target.value)}
          >
            {instituciones.opciones.map((institucion) => (
              <option key={institucion.id} value={institucion.id}>
                {institucion.nombre}
              </option>
            ))}
          </CampoSelect>

          <label className={estilos.opcionesExtra}>
            <input
              type="checkbox"
              className={estilos.casilla}
              checked={incluirInactivas}
              onChange={(e) => setIncluirInactivas(e.target.checked)}
            />
            Incluir desactivadas
          </label>
        </div>

        {listado.isPending ? (
          <EsqueletoTabla filas={5} columnas={5} />
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
        ) : listado.datos.length === 0 ? (
          <EstadoVacio
            titulo="Sin recepciones"
            texto={
              institucionId
                ? "Ninguna recepción coincide con los filtros aplicados."
                : "Todavía no se ha registrado ninguna donación."
            }
          />
        ) : (
          <>
            <Tabla titulo="Recepciones de donación">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Institución donante</th>
                  <th>Código del envío</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listado.datos.map((recepcion) => (
                  <tr key={recepcion.id}>
                    <CeldaCantidad>
                      {formatearFecha(recepcion.fecha_recepcion)}
                    </CeldaCantidad>
                    <td className={estilos.institucion}>
                      {nombreInstitucion(recepcion.institucion_id)}
                    </td>
                    <CeldaIdentificador>
                      {recepcion.codigo_lote ?? "—"}
                    </CeldaIdentificador>
                    <td>
                      {recepcion.activo ? (
                        <Insignia tono="aprobada">Activa</Insignia>
                      ) : (
                        <Insignia tono="neutra">Desactivada</Insignia>
                      )}
                    </td>
                    <CeldaAcciones>
                      <Boton
                        pequeno
                        variante="secundaria"
                        onClick={() => setFichaId(recepcion.id)}
                      >
                        Ver recepción
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

      {creando && (
        <ModalRecepcion
          abierto={creando}
          onCerrar={() => setCreando(false)}
          // Registrar el envío y no poder abrirlo obligaría a buscarlo en la
          // tabla, y lo que sigue después de registrarlo es cargar sus lotes.
          onCreada={(recepcionNueva) => setFichaId(recepcionNueva)}
        />
      )}

      {fichaId !== null && (
        <ModalFichaRecepcion
          // La clave remonta la ficha al cambiar de recepción: sin ella se
          // reutilizaría el estado del modal de edición de la anterior.
          key={fichaId}
          recepcionId={fichaId}
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

export default PaginaDonaciones;
