import Logotipo from "../marca/Logotipo";
import { useAuth } from "../../auth/useAuth";
import estilos from "./BarraSuperior.module.css";

/** Etiquetas legibles de los roles. El API devuelve el identificador crudo. */
const NOMBRE_ROL: Record<string, string> = {
  EMPLEADO_DMM: "Trabajo social",
  DIRECTORA: "Dirección",
  ALCALDE: "Alcaldía",
  ADMINISTRADOR: "Administración",
};

function BarraSuperior() {
  const { usuario, salir, saliendo } = useAuth();

  return (
    <header className={estilos.barra}>
      <div className={estilos.marca}>
        {/* alt vacío: el nombre de la institución ya está en el título del
            documento y repetirlo en cada pantalla es ruido para el lector. */}
        <Logotipo alto={40} alt="" />
      </div>

      <div className={estilos.usuario}>
        <div className={estilos.identidad}>
          <p className={estilos.nombre}>{usuario?.username}</p>
          <p className={estilos.rol}>
            {usuario ? (NOMBRE_ROL[usuario.rol] ?? usuario.rol) : null}
          </p>
        </div>
        <button
          type="button"
          className={estilos.salir}
          onClick={() => void salir()}
          disabled={saliendo}
        >
          {saliendo ? "Cerrando…" : "Cerrar sesión"}
        </button>
      </div>
    </header>
  );
}

export default BarraSuperior;
