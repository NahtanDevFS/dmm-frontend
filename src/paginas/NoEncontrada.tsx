import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { rutaInicialDe } from "../rutas/navegacion";
import estilos from "./EnConstruccion.module.css";

function NoEncontrada() {
  const { usuario } = useAuth();

  return (
    <>
      <h1>Página no encontrada</h1>
      <div className={estilos.aviso}>
        <p className={estilos.texto}>
          La dirección que abrió no corresponde a ningún módulo del sistema.
          Puede haber cambiado, o el enlace estar mal copiado.
        </p>
        <p className={estilos.texto} style={{ marginTop: "var(--space-2)" }}>
          <Link to={rutaInicialDe(usuario?.rol)}>Volver al inicio</Link>
        </p>
      </div>
    </>
  );
}

export default NoEncontrada;
