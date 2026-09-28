import { Link } from "react-router-dom";
import Logotipo from "../marca/Logotipo";
import MenuCuenta from "./MenuCuenta";
import estilos from "./BarraSuperior.module.css";

function BarraSuperior() {
  return (
    <header className={estilos.barra}>
      {/* Lleva a la raíz, que ya redirige a cada rol a su pantalla de inicio.
          El nombre accesible lo da aria-label; el alt del logo queda vacío
          para no anunciar dos veces. */}
      <Link to="/" className={estilos.marca} aria-label="Ir al inicio">
        <Logotipo alto={40} alt="" />
      </Link>

      <MenuCuenta />
    </header>
  );
}

export default BarraSuperior;
