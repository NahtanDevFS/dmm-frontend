import { useState } from "react";
import CatalogoGenerico from "./CatalogoGenerico";
import SeccionComunidades from "./SeccionComunidades";
import SeccionFormularios from "./SeccionFormularios";
import SeccionFormulariosCategoria from "./SeccionFormulariosCategoria";
import { CATALOGOS } from "./definiciones";
import estilos from "./Catalogos.module.css";

const COMUNIDADES = "comunidades";
const FORMULARIOS = "formularios-categoria";
const DEFINIR_FORMULARIOS = "formularios";

function PaginaCatalogos() {
  const [activo, setActivo] = useState<string>(CATALOGOS[0].ruta);

  const definicion = CATALOGOS.find((c) => c.ruta === activo);

  return (
    <>
      <header className={estilos.encabezado}>
        <h1>Catálogos</h1>
        <p className={estilos.nota}>
          Las listas que alimentan los formularios del sistema. Desactivar no
          borra: el registro deja de ofrecerse, pero quienes ya lo usan lo
          conservan.
        </p>
      </header>

      {/*
        Píldoras y no pestañas: son siete destinos y con pestañas se saldrían
        de la línea en cualquier pantalla estrecha. El activo lleva fondo,
        texto, borde y aria-pressed, que es la señal que oye un lector.
      */}
      <div
        className={estilos.selector}
        role="group"
        aria-label="Elegir catálogo"
      >
        {CATALOGOS.map((catalogo) => (
          <button
            key={catalogo.ruta}
            type="button"
            className={
              estilos.pildora +
              (activo === catalogo.ruta ? " " + estilos.pildoraActiva : "")
            }
            aria-pressed={activo === catalogo.ruta}
            onClick={() => setActivo(catalogo.ruta)}
          >
            {catalogo.titulo}
          </button>
        ))}
        <button
          type="button"
          className={
            estilos.pildora +
            (activo === COMUNIDADES ? " " + estilos.pildoraActiva : "")
          }
          aria-pressed={activo === COMUNIDADES}
          onClick={() => setActivo(COMUNIDADES)}
        >
          Comunidades
        </button>
        <button
          type="button"
          className={
            estilos.pildora +
            (activo === DEFINIR_FORMULARIOS ? " " + estilos.pildoraActiva : "")
          }
          aria-pressed={activo === DEFINIR_FORMULARIOS}
          onClick={() => setActivo(DEFINIR_FORMULARIOS)}
        >
          Formularios
        </button>
        <button
          type="button"
          className={
            estilos.pildora +
            (activo === FORMULARIOS ? " " + estilos.pildoraActiva : "")
          }
          aria-pressed={activo === FORMULARIOS}
          onClick={() => setActivo(FORMULARIOS)}
        >
          Formularios por categoría
        </button>
      </div>

      {activo === COMUNIDADES ? (
        <SeccionComunidades />
      ) : activo === DEFINIR_FORMULARIOS ? (
        <SeccionFormularios />
      ) : activo === FORMULARIOS ? (
        <SeccionFormulariosCategoria />
      ) : definicion ? (
        // La clave remonta el componente al cambiar de catálogo: si no, el
        // formulario de alta conservaría lo escrito para el anterior.
        <CatalogoGenerico key={definicion.ruta} definicion={definicion} />
      ) : null}
    </>
  );
}

export default PaginaCatalogos;
