import { Navigate, Route, Routes } from "react-router-dom";
import LayoutApp from "../componentes/layout/LayoutApp";
import EnConstruccion from "../paginas/EnConstruccion";
import NoEncontrada from "../paginas/NoEncontrada";
import RutaPorRol from "./RutaPorRol";
import { NAVEGACION, rutaInicialDe } from "./navegacion";
import { useAuth } from "../auth/useAuth";

/**
 * Árbol de rutas de la aplicación.
 *
 * Se genera a partir del mismo modelo que alimenta el menú lateral, así que un
 * módulo no puede quedar en el menú sin ruta ni tener ruta sin aparecer en el
 * menú, ni protegerse con un conjunto de roles distinto al que decide su
 * visibilidad. Las pantallas reales van sustituyendo a EnConstruccion.
 */
function Rutas() {
  const { usuario } = useAuth();
  const inicio = rutaInicialDe(usuario?.rol);

  return (
    <LayoutApp>
      <Routes>
        {NAVEGACION.map((item) => (
          <Route
            key={item.ruta}
            path={item.ruta}
            element={
              /**
               * ALCALDE no tiene Inicio: su acceso es solo Reportes, así que
               * la raíz lo lleva a su módulo en lugar de darle una pantalla de
               * acceso denegado nada más entrar.
               */
              item.ruta === "/" && inicio !== "/" ? (
                <Navigate to={inicio} replace />
              ) : (
                <RutaPorRol permitidos={item.roles}>
                  <EnConstruccion titulo={item.etiqueta} />
                </RutaPorRol>
              )
            }
          />
        ))}
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </LayoutApp>
  );
}

export default Rutas;
