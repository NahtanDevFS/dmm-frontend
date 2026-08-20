import { useAuth } from "../../auth/useAuth";
import estilos from "./PaginaInicio.module.css";

const NOMBRE_ROL: Record<string, string> = {
  EMPLEADO_DMM: "Trabajo social",
  DIRECTORA: "Dirección",
  ALCALDE: "Alcaldía",
  ADMINISTRADOR: "Administración",
};

function PaginaInicio() {
  const { usuario } = useAuth();

  return (
    <header className={estilos.bienvenida}>
      {/*
        Se saluda por el nombre de usuario porque es lo único que devuelve
        /auth/me: la tabla usuario no guarda nombre completo. En cuanto el API
        lo exponga, se cambia aquí y en la barra superior.

        «Le damos la bienvenida» evita marcar género, que el sistema tampoco
        conoce, y encaja con el tono directo y respetuoso del manual.
      */}
      <h1 className={estilos.saludo}>
        Le damos la bienvenida, {usuario?.username}
      </h1>
      <p className={estilos.contexto}>
        {usuario ? (NOMBRE_ROL[usuario.rol] ?? usuario.rol) : null} · Dirección
        Municipal de la Mujer, Usumatlán
      </p>
    </header>
  );
}

export default PaginaInicio;
