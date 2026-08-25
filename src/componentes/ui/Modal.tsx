import { useEffect, useId, useRef, type ReactNode } from "react";
import estilos from "./Modal.module.css";

interface PropsModal {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  /** Pie de acciones. Normalmente un GrupoBotones. */
  pie?: ReactNode;
  /**
   * Impide cerrar con Esc o clic fuera. Se usa mientras una operación está en
   * curso: cerrar a media escritura dejaría al usuario sin saber si se guardó.
   */
  bloqueado?: boolean;
  /** `amplio` para las fichas, que traen varias regiones y no un solo formulario. */
  tamano?: "normal" | "amplio";
  children: ReactNode;
}

/**
 * Modal del sistema, sobre el elemento nativo `dialog`.
 *
 * Se apoya en `showModal()` en lugar de reimplementar el comportamiento: el
 * navegador ya aporta la trampa de foco, el cierre con Esc, el retorno del
 * foco al elemento que lo abrió y la inercia del fondo. Una trampa de foco
 * escrita a mano es de las cosas que más fácilmente quedan a medias.
 */
function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  pie,
  bloqueado = false,
  tamano = "normal",
  children,
}: PropsModal) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescripcion = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;

    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;

    // `cancel` cubre la tecla Esc. Se intercepta para que el cierre pase
    // siempre por onCerrar y el estado de React no quede desincronizado del
    // DOM, que es lo que ocurre si el navegador cierra el diálogo por su
    // cuenta mientras `abierto` sigue en true.
    const alCancelar = (evento: Event) => {
      evento.preventDefault();
      if (!bloqueado) onCerrar();
    };
    dialogo.addEventListener("cancel", alCancelar);
    return () => dialogo.removeEventListener("cancel", alCancelar);
  }, [onCerrar, bloqueado]);

  /**
   * Clic en el velo. El backdrop no es un elemento propio, así que un clic
   * sobre él llega al `dialog`; se compara con el rectángulo del diálogo para
   * distinguirlo de un clic dentro del contenido.
   */
  const alPulsar = (evento: React.MouseEvent<HTMLDialogElement>) => {
    if (bloqueado || evento.target !== referencia.current) return;
    const caja = referencia.current.getBoundingClientRect();
    const dentro =
      evento.clientX >= caja.left &&
      evento.clientX <= caja.right &&
      evento.clientY >= caja.top &&
      evento.clientY <= caja.bottom;
    if (!dentro) onCerrar();
  };

  return (
    <dialog
      ref={referencia}
      className={
        estilos.dialogo + (tamano === "amplio" ? " " + estilos.amplio : "")
      }
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onMouseDown={alPulsar}
    >
      <div className={estilos.marco}>
        <div className={estilos.cabecera}>
          <div>
            <h2 id={idTitulo} className={estilos.titulo}>
              {titulo}
            </h2>
            {descripcion && (
              <p id={idDescripcion} className={estilos.descripcion}>
                {descripcion}
              </p>
            )}
          </div>
          <button
            type="button"
            className={estilos.cerrar}
            onClick={onCerrar}
            disabled={bloqueado}
            aria-label={"Cerrar " + titulo.toLowerCase()}
          >
            {/* Aspa tipográfica, no un icono decorativo. */}
            &times;
          </button>
        </div>

        <div className={estilos.cuerpo}>{children}</div>

        {pie && <div className={estilos.pie}>{pie}</div>}
      </div>
    </dialog>
  );
}

export default Modal;
