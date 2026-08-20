import { useAuth } from "./auth/useAuth";
import Rutas from "./rutas/Rutas";
import PaginaAcceso from "./paginas/acceso/PaginaAcceso";

function App() {
  const { usuario, comprobandoSesion } = useAuth();

  /**
   * Mientras se resuelve GET /auth/me no se decide nada. Mostrar la pantalla de
   * acceso durante ese instante haría parpadear el login ante alguien que sí
   * tiene sesión, y le invitaría a escribir una contraseña que no hacía falta.
   */
  if (comprobandoSesion) {
    return (
      <p role="status" className="solo-lectores">
        Comprobando sesión…
      </p>
    );
  }

  /**
   * Sin sesión no se monta el router: la aplicación entera está detrás del
   * acceso, así que no hay ninguna ruta pública que enrutar. Esto también
   * evita que una dirección escrita a mano llegue a montar una pantalla antes
   * de saber quién la abre.
   */
  if (!usuario) return <PaginaAcceso />;

  return <Rutas />;
}

export default App;
