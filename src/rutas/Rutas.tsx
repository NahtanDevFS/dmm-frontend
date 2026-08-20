import { Route, Routes } from "react-router-dom";
import LayoutApp from "../componentes/layout/LayoutApp";
import EnConstruccion from "../paginas/EnConstruccion";
import NoEncontrada from "../paginas/NoEncontrada";
import { NAVEGACION } from "./navegacion";

/**
 * Árbol de rutas de la aplicación.
 *
 * Se genera a partir del mismo modelo que alimenta el menú lateral, así que un
 * módulo no puede quedar en el menú sin ruta ni tener ruta sin aparecer en el
 * menú. Las pantallas reales van sustituyendo a EnConstruccion una por una.
 */
function Rutas() {
  return (
    <LayoutApp>
      <Routes>
        {NAVEGACION.map((item) => (
          <Route
            key={item.ruta}
            path={item.ruta}
            element={<EnConstruccion titulo={item.etiqueta} />}
          />
        ))}
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </LayoutApp>
  );
}

export default Rutas;
