import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LayoutApp from "../componentes/layout/LayoutApp";
import EnConstruccion from "../paginas/EnConstruccion";
import NoEncontrada from "../paginas/NoEncontrada";
import PaginaInicio from "../paginas/inicio/PaginaInicio";
import RutaPorRol from "./RutaPorRol";
import { NAVEGACION, rutaInicialDe } from "./navegacion";
import { useAuth } from "../auth/useAuth";

/**
 * Árbol de rutas de la aplicación.
 *
 * Se genera a partir del mismo modelo que alimenta el menú lateral, así que un
 * módulo no puede quedar en el menú sin ruta ni tener ruta sin aparecer en el
 * menú, ni protegerse con un conjunto de roles distinto al que decide su
 * visibilidad.
 *
 * PANTALLAS es el registro de módulos ya construidos: los que no aparecen ahí
 * caen en EnConstruccion. Cada módulo se incorpora añadiendo una línea, sin
 * tocar la navegación ni las guardas.
 */
const PANTALLAS: Record<string, ReactNode> = {
  "/": <PaginaInicio />,
};
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
                  {PANTALLAS[item.ruta] ?? (
                    <EnConstruccion titulo={item.etiqueta} />
                  )}
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
