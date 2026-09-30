import type { ReactNode } from "react";
import estilos from "./Nota.module.css";

export type TonoNota = "informativa" | "exito" | "advertencia";

/* Nota de una o varias frases dentro de un formulario o modal: reglas que
   conviene leer antes de llenar, o la confirmación de lo que ya se hizo.
   
   No es una Insignia: la insignia es una píldora de una o dos palabras que no
   se parte en líneas, y con una frase adentro se sale de su caja y ensancha
   el modal en el teléfono. La nota sí ajusta el texto al ancho disponible. */
function Nota({
  tono = "informativa",
  children,
}: {
  tono?: TonoNota;
  children: ReactNode;
}) {
  return <p className={estilos.nota + " " + estilos[tono]}>{children}</p>;
}

export default Nota;
