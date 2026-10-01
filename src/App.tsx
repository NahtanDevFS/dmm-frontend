import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import { RUTA_ACCESO } from "./api/sesion";
import { destinoTrasEntrar, direccionDeAcceso } from "./rutas/acceso";
import Rutas from "./rutas/Rutas";
import PaginaAcceso from "./paginas/acceso/PaginaAcceso";
import PantallaCierrePendiente from "./paginas/acceso/PantallaCierrePendiente";

function App() {
  const { usuario, comprobandoSesion, cierrePendiente, salidaManual } =
    useAuth();
  const { pathname, search } = useLocation();

  /* Va antes que todo: con un cierre sin confirmar no se rescata la sesión ni
     se muestra el acceso como si nada, porque la sesión anterior podría seguir
     viva en el servidor */
  if (cierrePendiente) return <PantallaCierrePendiente />;

  /* Mientras se resuelve GET /auth/me no se decide nada. Mostrar la pantalla de
     acceso durante ese instante haría parpadear el login ante alguien que sí
     tiene sesión, y le invitaría a escribir una contraseña que no hacía falta */
  if (comprobandoSesion) {
    return (
      <p role="status" className="solo-lectores">
        Comprobando sesión…
      </p>
    );
  }

  /* Sin sesión no se monta el router: la aplicación entera está detrás del
     acceso, así que no hay ninguna ruta pública que enrutar. Esto también
     evita que una dirección escrita a mano llegue a montar una pantalla antes
     de saber quién la abre */
  if (!usuario) {
    // La dirección dice dónde se está: «/acceso», y no la pantalla de antes
    if (pathname !== RUTA_ACCESO) {
      return (
        <Navigate
          to={direccionDeAcceso(pathname, search, !salidaManual)}
          replace
        />
      );
    }
    return <PaginaAcceso />;
  }

  // Recién entrado (o abrió «/acceso» con sesión): a la pantalla guardada o
  // a su inicio
  if (pathname === RUTA_ACCESO) {
    return <Navigate to={destinoTrasEntrar(usuario.rol, search)} replace />;
  }

  return <Rutas />;
}

export default App;
