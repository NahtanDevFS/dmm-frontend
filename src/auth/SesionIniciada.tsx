import Logotipo from "../componentes/marca/Logotipo";
import { useAuth } from "./useAuth";
import estilos from "./SesionIniciada.module.css";

/**
 * Cascarón provisional para la sesión abierta.
 *
 * Existe solo para poder ejercitar el cierre de sesión y comprobar que la
 * sesión sobrevive a una recarga. El PR de layout lo sustituye por la barra
 * superior de 60 px, el menú lateral de 250 px y el ruteo por rol.
 */
function SesionIniciada() {
  const { usuario, salir, saliendo } = useAuth();

  return (
    <>
      <header className={estilos.barra}>
        <div className={estilos.identidad}>
          <Logotipo alto={40} alt="" />
          <div>
            <p className={estilos.usuario}>{usuario?.username}</p>
            <p className={estilos.rol}>{usuario?.rol}</p>
          </div>
        </div>
        <button
          type="button"
          className={estilos.botonSalir}
          onClick={() => void salir()}
          disabled={saliendo}
        >
          {saliendo ? "Cerrando…" : "Cerrar sesión"}
        </button>
      </header>

      <main className={estilos.cuerpo}>
        <div className={estilos.aviso}>
          <h1>Sesión iniciada</h1>
          <p className={estilos.avisoTexto}>
            La autenticación funciona. Las pantallas del sistema se incorporan
            en los siguientes cambios; esta vista es temporal y solo sirve para
            comprobar que la sesión se conserva al recargar y que el cierre de
            sesión la revoca.
          </p>
        </div>
      </main>
    </>
  );
}

export default SesionIniciada;
