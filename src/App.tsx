import { useAuth } from "./auth/useAuth";
import LayoutApp from "./componentes/layout/LayoutApp";
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

  if (!usuario) return <PaginaAcceso />;

  // El árbol de rutas entra en el siguiente commit; por ahora el marco se
  // monta con un contenido de relleno para poder ejercitarlo.
  return (
    <LayoutApp>
      <h1>Inicio</h1>
    </LayoutApp>
  );
}

export default App;
