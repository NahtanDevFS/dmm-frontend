import type { ReactNode } from "react";
import BarraSuperior from "./BarraSuperior";
import MenuLateral from "./MenuLateral";
import estilos from "./LayoutApp.module.css";

/**
 * Marco de la aplicación: barra superior de 60 px y menú lateral de 250 px,
 * ambos fijos, con el contenido como única zona con scroll (sección 4).
 */
function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <div className={estilos.marco}>
      <a className={estilos.saltar} href="#contenido">
        Saltar al contenido
      </a>
      <BarraSuperior />
      <div className={estilos.cuerpo}>
        <MenuLateral />
        <main id="contenido" className={estilos.contenido} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default LayoutApp;
