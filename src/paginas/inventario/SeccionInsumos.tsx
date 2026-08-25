import { useMemo, useState } from "react";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { mensajeDeError } from "../../lib/errores";
import { CLAVE_INSUMOS, type Insumo } from "../../api/inventario";
import type { ElementoCatalogo } from "../../types/api";
import estilos from "./Inventario.module.css";

/**
 * Catálogo de insumos.
 *
 * Es el listado maestro del módulo: define *qué* puede entrar en bodega, no
 * cuánto hay. Las existencias son cosa del semáforo y de la ficha de cada
 * insumo, porque viven a nivel de lote y no de insumo.
 */
function SeccionInsumos() {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  /**
   * Con los inactivos incluidos: un insumo puede apuntar a una categoría o a
   * una unidad dada de baja después, y sin esto la fila mostraría un guion
   * donde sí hay un dato.
   */
  const categorias = useCatalogo<ElementoCatalogo>("categorias-insumo", {
    incluirInactivos: true,
  });
  const unidades = useCatalogo<ElementoCatalogo>("unidades-medida", {
    incluirInactivos: true,
  });

  const filtros = useMemo(
    () => ({
      busqueda: busqueda.trim() || undefined,
      categoriaId: categoriaId || undefined,
      incluirInactivos: incluirInactivos ? "true" : undefined,
    }),
    [busqueda, categoriaId, incluirInactivos],
  );

  const listado = useListadoPaginado<Insumo>({
    clave: CLAVE_INSUMOS,
    ruta: "insumos",
    filtros,
  });

  const nombreDe = (catalogo: ElementoCatalogo[], id: number) =>
    catalogo.find((elemento) => elemento.id === id)?.nombre ?? "—";

  return (
    <section className={estilos.tarjeta} aria-labelledby="inv-insumos">
      <h2 id="inv-insumos" className="solo-lectores">
        Catálogo de insumos
      </h2>

      <div className={estilos.filtros}>
        <CampoTexto
          className={estilos.filtroBusqueda}
          etiqueta="Buscar"
          type="search"
          placeholder="Nombre del insumo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          /*
            El backend busca con `contains` en modo insensitive, que ignora
            mayúsculas pero no acentos: «jabon» no encuentra «Jabón». Se avisa
            en el propio campo porque si no el usuario concluiría que el insumo
            no está registrado y lo daría de alta por segunda vez.
          */
          ayuda="Escriba los acentos: «jabon» no encuentra «Jabón»."
        />

        <CampoSelect
          className={estilos.filtroSelect}
          etiqueta="Categoría"
          marcador="Todas las categorías"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
        >
          {categorias.opciones.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </CampoSelect>

        <label className={estilos.opcionesExtra}>
          <input
            type="checkbox"
            className={estilos.casilla}
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
          />
          Incluir inactivos
        </label>
      </div>

      {listado.isPending ? (
        <EsqueletoTabla filas={5} columnas={4} />
      ) : listado.isError ? (
        <EstadoVacio
          titulo="No se pudo cargar el catálogo de insumos"
          texto={mensajeDeError(listado.error)}
          accion={
            <Boton variante="secundaria" onClick={() => void listado.refetch()}>
              Reintentar
            </Boton>
          }
        />
      ) : listado.datos.length === 0 ? (
        <EstadoVacio
          titulo="Sin insumos"
          texto={
            busqueda || categoriaId
              ? "Ningún insumo coincide con los filtros aplicados. Revise los acentos de la búsqueda."
              : "Todavía no hay insumos en el catálogo."
          }
        />
      ) : (
        <>
          <Tabla titulo="Catálogo de insumos">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Categoría</th>
                <th>Unidad base</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {listado.datos.map((insumo) => (
                <tr key={insumo.id}>
                  <td className={estilos.nombre}>{insumo.nombre}</td>
                  <td>{nombreDe(categorias.opciones, insumo.categoria_id)}</td>
                  <td>
                    {nombreDe(unidades.opciones, insumo.unidad_medida_base_id)}
                  </td>
                  <td>
                    {insumo.activo ? (
                      <Insignia tono="aprobada">Activo</Insignia>
                    ) : (
                      <Insignia tono="neutra">Inactivo</Insignia>
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
  );
}

export default SeccionInsumos;
