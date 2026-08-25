import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LayoutApp from "../componentes/layout/LayoutApp";
import EnConstruccion from "../paginas/EnConstruccion";
import NoEncontrada from "../paginas/NoEncontrada";
import PaginaInicio from "../paginas/inicio/PaginaInicio";
import PaginaBeneficiarios from "../paginas/beneficiarios/PaginaBeneficiarios";
import PaginaCatalogos from "../paginas/catalogos/PaginaCatalogos";
import PaginaInventario from "../paginas/inventario/PaginaInventario";
import PaginaDonaciones from "../paginas/donaciones/PaginaDonaciones";
import { OPERACION, type Rol } from "../types/api";
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
  "/beneficiarios": <PaginaBeneficiarios />,
  "/catalogos": <PaginaCatalogos />,
  "/inventario": <PaginaInventario />,
  "/donaciones": <PaginaDonaciones />,
};

/**
 * Rutas que no son ítems de menú: altas, fichas y detalles. Declaran su propio
 * conjunto de roles porque no lo heredan de un ítem de navegación, y pasan por
 * la misma guarda que el resto.
 *
 * Todas rinden la misma pantalla que su módulo. Las altas y las fichas se
 * abren en modal sobre el listado, así que la ruta no cambia de vista: le dice
 * a la pantalla qué modal abrir al entrar. Existen para que un enlace guardado
 * o compartido siga llevando al mismo sitio; desde la propia tabla no se
 * navega, para no perder el filtro ni la página.
 */
const RUTAS_EXTRA: { ruta: string; roles: readonly Rol[]; elemento: ReactNode }[] =
  [
    {
      ruta: "/beneficiarios/nuevo",
      roles: OPERACION,
      elemento: <PaginaBeneficiarios />,
    },
    {
      // Va después de /nuevo: si fuera antes, «nuevo» se leería como un id.
      ruta: "/beneficiarios/:id",
      roles: OPERACION,
      elemento: <PaginaBeneficiarios />,
    },
    {
      // La ficha del insumo es de consulta, no de gestión: cualquiera que
      // trabaje a diario necesita ver cuánto queda. Lo que se restringe a
      // dirección son los botones de edición, no la puerta.
      ruta: "/inventario/insumos/:id",
      roles: OPERACION,
      elemento: <PaginaInventario />,
    },
  ];
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
        {RUTAS_EXTRA.map((extra) => (
          <Route
            key={extra.ruta}
            path={extra.ruta}
            element={
              <RutaPorRol permitidos={extra.roles}>{extra.elemento}</RutaPorRol>
            }
          />
        ))}

        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </LayoutApp>
  );
}

export default Rutas;
