import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { mensajeDeError } from "../../lib/errores";
import { formatearFecha } from "../../lib/fechas";
import {
  CLAVE_INSUMOS,
  desactivarInsumo,
  reactivarInsumo,
  listarStockInsumos,
  type Insumo,
  type StockInsumoListado,
} from "../../api/inventario";
import type { ElementoCatalogo } from "../../types/api";
import { BANDERAS } from "./banderas";
import { nivelDe } from "./semaforo";
import ModalInsumo from "./ModalInsumo";
import estilos from "./Inventario.module.css";

/**
 * Catálogo de insumos.
 *
 * Es el listado maestro del módulo: define *qué* puede entrar en bodega, no
 * cuánto hay. Las existencias son cosa del semáforo y de la ficha de cada
 * insumo, porque viven a nivel de lote y no de insumo.
 */
function SeccionInsumos({
  puedeGestionar,
  onVerFicha,
}: {
  puedeGestionar: boolean;
  onVerFicha: (insumoId: number) => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);

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

  /**
   * Existencias de todos los insumos en una sola consulta, para poder
   * mostrarlas en el listado.
   *
   * Sin esto, la tabla decía qué insumos existen pero no si había alguno: para
   * contestar «¿hay acetaminofén?» había que entrar a la ficha de cada uno. El
   * dato que se busca en un catálogo de insumos casi siempre es cuánto queda.
   *
   * Se consulta aparte del listado porque este está paginado y filtrado por el
   * servidor, y v_stock_insumo no conoce esos filtros; se cruzan por id.
   */
  const stock = useQuery({
    queryKey: [CLAVE_INSUMOS, "stock"],
    queryFn: () => listarStockInsumos(),
  });

  const stockPorInsumo = useMemo(() => {
    const mapa = new Map<number, StockInsumoListado>();
    for (const fila of stock.data ?? []) mapa.set(fila.insumo_id, fila);
    return mapa;
  }, [stock.data]);

  const listado = useListadoPaginado<Insumo>({
    clave: CLAVE_INSUMOS,
    ruta: "insumos",
    filtros,
  });

  const cambioEstado = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      activar ? reactivarInsumo(id) : desactivarInsumo(id),
    onSuccess: async (_datos, { activar }) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_INSUMOS] });
      avisar(activar ? "Insumo reactivado." : "Insumo desactivado.", "exito");
    },
    /*
      El 409 de aquí no es un fallo: el servidor comprueba que no queden
      solicitudes activas ni existencias disponibles, y su mensaje dice cuál de
      las dos cosas bloquea. Se muestra tal cual porque es lo único que le
      indica al usuario qué tiene que resolver antes de volver a intentarlo.
    */
    onError: (error) => avisar(mensajeDeError(error), "error"),
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
        <EsqueletoTabla filas={5} columnas={5} />
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
                <th>Disponible</th>
                <th>Próxima caducidad</th>
                <th>Requisitos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listado.datos.map((insumo) => {
                const requisitos = BANDERAS.filter(
                  (bandera) => insumo[bandera.clave],
                );
                const existencias = stockPorInsumo.get(insumo.id);
                // Un insumo desactivado queda fuera de v_stock_insumo: no es
                // que tenga cero, es que no se consulta. Decir "0" sería
                // afirmar algo que nadie comprobó.
                const sinDato = existencias === undefined;
                const nivel = existencias
                  ? nivelDe(existencias.semaforo, existencias.stock_total === 0)
                  : null;
                return (
                  <tr key={insumo.id}>
                    <td className={estilos.nombre}>{insumo.nombre}</td>
                    <td>
                      {nombreDe(categorias.opciones, insumo.categoria_id)}
                    </td>
                    <td>
                      {nombreDe(
                        unidades.opciones,
                        insumo.unidad_medida_base_id,
                      )}
                    </td>
                    <CeldaCantidad>
                      {sinDato ? (
                        "—"
                      ) : existencias.stock_total === 0 ? (
                        <Insignia tono="rechazada">Sin existencias</Insignia>
                      ) : (
                        existencias.stock_total.toLocaleString("es-GT")
                      )}
                    </CeldaCantidad>
                    <td>
                      {existencias?.proxima_caducidad ? (
                        <span className={estilos.requisitos}>
                          {formatearFecha(existencias.proxima_caducidad)}
                          {nivel && (
                            <Insignia tono={nivel.tono}>
                              {nivel.etiqueta}
                            </Insignia>
                          )}
                        </span>
                      ) : insumo.requiere_fecha_caducidad ? (
                        // Exige caducidad pero no hay ningún lote vigente del
                        // cual leerla: no es lo mismo que "no caduca".
                        <span className={estilos.banderaAyuda}>Sin lotes</span>
                      ) : (
                        "No caduca"
                      )}
                    </td>
                    <td>
                      {requisitos.length === 0 ? (
                        "Ninguno"
                      ) : (
                        <span className={estilos.requisitos}>
                          {requisitos.map((bandera) => (
                            <Insignia key={bandera.clave} tono="informativa">
                              {bandera.etiqueta}
                            </Insignia>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      {insumo.activo ? (
                        <Insignia tono="aprobada">Activo</Insignia>
                      ) : (
                        <Insignia tono="neutra">Inactivo</Insignia>
                      )}
                    </td>
                    <CeldaAcciones>
                      <span className={estilos.acciones}>
                        <Boton
                          pequeno
                          variante="secundaria"
                          onClick={() => onVerFicha(insumo.id)}
                        >
                          Ver ficha
                        </Boton>
                        {puedeGestionar && (
                          <Boton
                            pequeno
                            variante="secundaria"
                            onClick={() => setEditando(insumo)}
                          >
                            Editar
                          </Boton>
                        )}
                        {puedeGestionar &&
                          (insumo.activo ? (
                            <Boton
                              pequeno
                              variante="terciaria"
                              onClick={async () => {
                                const ok = await confirmar({
                                  titulo: "Desactivar insumo",
                                  mensaje:
                                    "«" +
                                    insumo.nombre +
                                    "» dejará de ofrecerse al registrar donaciones y solicitudes. Los lotes ya recibidos se conservan y puede reactivarse después.",
                                  textoConfirmar: "Desactivar",
                                  destructiva: true,
                                });
                                if (ok) {
                                  cambioEstado.mutate({
                                    id: insumo.id,
                                    activar: false,
                                  });
                                }
                              }}
                            >
                              Desactivar
                            </Boton>
                          ) : (
                            <Boton
                              pequeno
                              variante="secundaria"
                              onClick={() =>
                                cambioEstado.mutate({
                                  id: insumo.id,
                                  activar: true,
                                })
                              }
                            >
                              Reactivar
                            </Boton>
                          ))}
                      </span>
                    </CeldaAcciones>
                  </tr>
                );
              })}
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

      {editando && (
        <ModalInsumo
          // La clave remonta el formulario al cambiar de insumo: sin ella
          // conservaría lo escrito para el anterior, porque el estado inicial
          // solo se lee en el primer render.
          key={editando.id}
          insumo={editando}
          abierto
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  );
}

export default SeccionInsumos;
