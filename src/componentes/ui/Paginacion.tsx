import estilos from "./Paginacion.module.css";
import { ventanaDePaginas } from "./ventanaDePaginas";

interface PropsPaginacion {
  /** Datos tal como los devuelve useListadoPaginado. */
  total: number;
  limite: number;
  desplazamiento: number;
  paginaActual: number;
  totalPaginas: number;
  irAPagina: (pagina: number) => void;
  anterior: () => void;
  siguiente: () => void;
  /** Bloquea los controles mientras se trae la página siguiente. */
  cargando?: boolean;
}

/**
 * Paginación conectada al sobre del API.
 *
 * Recibe los valores ya calculados por useListadoPaginado en vez de repetir
 * aquí la aritmética de `limite` y `desplazamiento`, que es donde suelen
 * aparecer los desfases de una página.
 */
function Paginacion({
  total,
  limite,
  desplazamiento,
  paginaActual,
  totalPaginas,
  irAPagina,
  anterior,
  siguiente,
  cargando = false,
}: PropsPaginacion) {
  // Sin resultados no se pinta nada: una paginación de una sola página vacía
  // es ruido, y el estado vacío ya explica que no hay registros.
  if (total === 0) return null;

  const primero = desplazamiento + 1;
  const ultimo = Math.min(desplazamiento + limite, total);

  return (
    <nav className={estilos.paginacion} aria-label="Paginación de resultados">
      <p className={estilos.info} aria-live="polite">
        Mostrando {primero} a {ultimo} de {total}{" "}
        {total === 1 ? "registro" : "registros"}
      </p>

      <button
        type="button"
        className={estilos.boton}
        onClick={anterior}
        disabled={paginaActual <= 1 || cargando}
      >
        Anterior
      </button>

      {ventanaDePaginas(paginaActual, totalPaginas).map((pagina, indice) =>
        pagina === "…" ? (
          <span
            key={"salto-" + indice}
            className={estilos.elipsis}
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={pagina}
            type="button"
            className={
              pagina === paginaActual
                ? estilos.boton + " " + estilos.actual
                : estilos.boton
            }
            onClick={() => irAPagina(pagina)}
            disabled={cargando}
            aria-current={pagina === paginaActual ? "page" : undefined}
            aria-label={"Página " + pagina}
          >
            {pagina}
          </button>
        ),
      )}

      <button
        type="button"
        className={estilos.boton}
        onClick={siguiente}
        disabled={paginaActual >= totalPaginas || cargando}
      >
        Siguiente
      </button>
    </nav>
  );
}

export default Paginacion;
