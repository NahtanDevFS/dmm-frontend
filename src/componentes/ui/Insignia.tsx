import type { ReactNode } from "react";
import type { TonoInsignia } from "./tonos";
import estilos from "./Insignia.module.css";

/**
 * Badge de estado.
 *
 * El texto no es opcional y no existe variante «solo color»: la seccion 7
 * exige que el estado sea color mas texto. Un punto de color sin palabra no
 * dice nada a quien no distingue el matiz, ni a un lector de pantalla.
 */
function Insignia({
  tono = "neutra",
  children,
}: {
  tono?: TonoInsignia;
  children: ReactNode;
}) {
  return (
    <span className={estilos.insignia + " " + estilos[tono]}>{children}</span>
  );
}

export default Insignia;
