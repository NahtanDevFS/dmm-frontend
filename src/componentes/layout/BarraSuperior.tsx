import Logotipo from "../marca/Logotipo";
import MenuCuenta from "./MenuCuenta";
import estilos from "./BarraSuperior.module.css";

function BarraSuperior() {
  return (
    <header className={estilos.barra}>
      <div className={estilos.marca}>
        {/* alt vacío: el nombre de la institución ya está en el título del
            documento y repetirlo en cada pantalla es ruido para el lector. */}
        <Logotipo alto={40} alt="" />
      </div>

      <MenuCuenta />
    </header>
  );
}

export default BarraSuperior;
