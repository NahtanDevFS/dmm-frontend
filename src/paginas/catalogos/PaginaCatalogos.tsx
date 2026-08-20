import { useState } from "react";
import CatalogoGenerico from "./CatalogoGenerico";
import { CATALOGOS } from "./definiciones";
import estilos from "./Catalogos.module.css";

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
        Píldoras y no pestañas: son seis destinos y con pestañas se saldrían
        de la línea en cualquier pantalla estrecha. El activo lleva fondo,
        texto, borde y aria-pressed, que es la señal que oye un lector.
      */}
      <div className={estilos.selector} role="group" aria-label="Elegir catálogo">
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
      </div>

      {definicion ? (
        // La clave remonta el componente al cambiar de catálogo: si no, el
        // formulario de alta conservaría lo escrito para el anterior.
        <CatalogoGenerico key={definicion.ruta} definicion={definicion} />
      ) : null}
    </>
  );
}

export default PaginaCatalogos;
