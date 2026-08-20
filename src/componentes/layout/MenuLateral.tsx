import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { navegacionDe } from "../../rutas/navegacion";
import estilos from "./MenuLateral.module.css";

function MenuLateral() {
  const { usuario } = useAuth();
  const items = navegacionDe(usuario?.rol);

  return (
    <nav className={estilos.menu} aria-label="Módulos del sistema">
      <div className={estilos.lista}>
        {items.map((item) => (
          <NavLink
            key={item.ruta}
            to={item.ruta}
            // `end` solo en la raíz: sin esto, «Inicio» quedaría marcado como
            // activo en todas las rutas, porque «/» es prefijo de todas.
            end={item.ruta === "/"}
            className={({ isActive }) =>
              isActive ? estilos.enlace + " " + estilos.activo : estilos.enlace
            }
          >
            {item.etiqueta}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default MenuLateral;
