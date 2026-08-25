import { useAvisos } from "./avisos/useAvisos";

/**
 * Cierre de un modal que puede llevar datos sin guardar.
 *
 * Un modal se cierra por tres caminos —la aspa, la tecla Esc y el clic fuera—
 * y los tres pasan por `onCerrar`. Por eso basta con envolver esa función:
 * envolviéndola quedan cubiertos los tres, incluido el clic fuera, que es el
 * que se hace sin querer.
 *
 * Solo pregunta cuando de verdad hay algo que perder. Un modal que se abrió y
 * no se tocó se cierra sin más: convertir cada cierre en una pregunta enseña a
 * confirmar sin leer, y entonces el aviso deja de proteger el caso que
 * importa.
 */
export function useCierreSeguro({
  hayCambios,
  onCerrar,
  mensaje,
}: {
  /** Si el formulario tiene algo escrito que todavía no se ha guardado. */
  hayCambios: boolean;
  onCerrar: () => void;
  /** Texto propio cuando el genérico no describe bien lo que se pierde. */
  mensaje?: string;
}) {
  const { confirmar } = useAvisos();

  return async () => {
    if (!hayCambios) {
      onCerrar();
      return;
    }

    const ok = await confirmar({
      titulo: "Descartar lo que escribió",
      mensaje:
        mensaje ??
        "Hay datos escritos que todavía no se han guardado. Si cierra ahora, se pierden.",
      textoConfirmar: "Descartar y cerrar",
      textoCancelar: "Seguir editando",
      destructiva: true,
    });
    if (ok) onCerrar();
  };
}
