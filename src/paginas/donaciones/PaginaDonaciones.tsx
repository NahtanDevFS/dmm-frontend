import { useMemo, useState } from "react";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, {
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

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <h1>Donaciones</h1>
          <p className={estilos.nota}>
            Cada recepción es un envío de una institución donante. Los insumos
            que trajo se registran dentro, como lotes de inventario.
          </p>
        </div>
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
    </>
  );
}

export default PaginaDonaciones;
