import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { rutaInicialDe } from "../rutas/navegacion";
import estilos from "./AccesoDenegado.module.css";

const NOMBRE_ROL: Record<string, string> = {
  EMPLEADO_DMM: "Trabajo social",
  DIRECTORA: "Dirección",
  ALCALDE: "Alcaldía",
  ADMINISTRADOR: "Administración",
};

/**
 * Pantalla para una ruta que existe pero que el rol no puede abrir.
 *
 * Se distingue a propósito de «página no encontrada»: decirle a alguien que
 * algo no existe cuando en realidad no le corresponde le deja buscando un
 * error que no cometió. Aquí se le dice qué pasó, con qué rol entró y a quién
 * pedirlo, sin detallar qué contiene el módulo.
 */
function AccesoDenegado() {
  const { usuario } = useAuth();
  const rol = usuario ? (NOMBRE_ROL[usuario.rol] ?? usuario.rol) : null;

  return (
    <>
      <h1>Acceso no autorizado</h1>
      <div className={estilos.tarjeta} role="alert">
        <p className={estilos.texto}>
          Este módulo no está disponible para su rol
          {rol ? (
            <>
              , <span className={estilos.rol}>{rol}</span>
            </>
          ) : null}
          . No es un error del sistema: los permisos se asignan por rol y el
          suyo no incluye esta sección.
        </p>
        <p className={estilos.texto}>
          Si necesita entrar, solicítelo al administrador del sistema, que es
          quien gestiona las cuentas y sus roles.
        </p>
        <div className={estilos.acciones}>
          <Link className={estilos.volver} to={rutaInicialDe(usuario?.rol)}>
            Volver a mi inicio
          </Link>
        </div>
      </div>
    </>
  );
}

export default AccesoDenegado;
