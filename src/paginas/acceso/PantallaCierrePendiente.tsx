import { useState } from "react";
import Logotipo from "../../componentes/marca/Logotipo";
import { useAuth } from "../../auth/useAuth";
import estilos from "./PaginaAcceso.module.css";

/**
 * Se muestra cuando «Cerrar sesión» no llegó a confirmarse en el servidor.
 *
 * Los datos ya se borraron de la pantalla, pero la cookie y la sesión pueden
 * seguir vivas. Decir «sesión cerrada» aquí sería falso: en una computadora
 * compartida, quien se va creyendo que cerró deja la puerta abierta a quien
 * se siente después. Por eso se dice lo que pasó y se ofrece reintentar; el
 * proveedor también reintenta solo al recargar y al volver la conexión.
 */
function PantallaCierrePendiente() {
  const { salir, saliendo } = useAuth();
  const [reintentado, setReintentado] = useState(false);

  const reintentar = async () => {
    setReintentado(true);
    await salir();
  };

  return (
    <div className={estilos.pagina}>
      <aside className={estilos.panel}>
        <Logotipo alto={300} alt="" className={estilos.marca} />
        <div>
          <h1 className={estilos.panelTitulo}>
            Dirección Municipal de la Mujer
          </h1>
          <p className={estilos.panelSubtitulo}>
            Sistema de gestión de beneficiarios, programas y entregas.
          </p>
        </div>
        <p className={estilos.panelAviso}>Solo acceso autorizado</p>
      </aside>

      <main className={estilos.zonaFormulario}>
        <div className={estilos.tarjeta}>
          <h2 className={estilos.titulo}>
            No se pudo confirmar el cierre de sesión
          </h2>
          <p className={estilos.ayuda}>
            Se ocultó la información de esta pantalla, pero no hubo conexión con
            el servidor para cerrar la sesión. Podría seguir abierta en esta
            computadora.
          </p>
          <p className={estilos.ayuda}>
            <strong>No deje el equipo hasta completar el cierre.</strong> Se
            reintentará automáticamente cuando vuelva la conexión.
          </p>

          <button
            type="button"
            className={estilos.botonEntrar}
            onClick={() => void reintentar()}
            disabled={saliendo}
          >
            {saliendo ? "Cerrando sesión…" : "Reintentar cierre de sesión"}
          </button>

          {reintentado && !saliendo && (
            <p className={estilos.errorGeneral} role="alert">
              Todavía no hay conexión con el servidor. Revise la red e intente
              de nuevo.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default PantallaCierrePendiente;
