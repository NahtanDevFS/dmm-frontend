import type { ReactNode } from "react";
import { useAuth } from "../auth/useAuth";
import { tieneRol, type Rol } from "../types/api";
import AccesoDenegado from "../paginas/AccesoDenegado";

/**
 * Guarda de rol para una ruta.
 *
 * Es una comodidad, no una defensa: la autorización real vive en el backend,
 * donde cada ruta declara su requireRole. Esta guarda solo evita que alguien
 * abra una pantalla que se llenaría de 403, y que el menú prometa lo que el
 * servidor va a negar. Quitarla no abriría ningún dato.
 */
function RutaPorRol({
  permitidos,
  children,
}: {
  permitidos: readonly Rol[];
  children: ReactNode;
}) {
  const { usuario } = useAuth();

  if (!tieneRol(usuario?.rol, permitidos)) return <AccesoDenegado />;

  return <>{children}</>;
}

export default RutaPorRol;
