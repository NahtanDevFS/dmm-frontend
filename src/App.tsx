import { useAuth } from "./auth/useAuth";
import SesionIniciada from "./auth/SesionIniciada";
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

  return usuario ? <SesionIniciada /> : <PaginaAcceso />;
}

export default App;
