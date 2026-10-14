import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Boton, { GrupoBotones } from "../Boton";
import Modal from "../Modal";
import { modalSuperior, suscribirCapaSuperior } from "../capaSuperior";
import {
  ContextoAvisos,
  type Aviso,
  type OpcionesConfirmacion,
  type TonoAviso,
  type ValorAvisos,
} from "./contexto";
import estilos from "./Avisos.module.css";

// Palabra que acompaña al color. El color nunca es la única señal.
const PALABRA: Record<TonoAviso, string> = {
  exito: "Listo",
  error: "Error",
  advertencia: "Atención",
  info: "Aviso",
};

// Un error se lee más despacio y suele necesitar copiarse o releerse.
const DURACION: Record<TonoAviso, number> = {
  exito: 4000,
  info: 5000,
  advertencia: 7000,
  error: 9000,
};

interface Pendiente {
  opciones: OpcionesConfirmacion;
  resolver: (respuesta: boolean) => void;
}

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const siguienteId = useRef(1);
  const refPila = useRef<HTMLDivElement>(null);

  /* Los avisos se montan DENTRO del modal que esté encima, si hay alguno.
     Fuera de él quedarían inertes y por debajo de la capa superior, que es lo
     que pasaba: el aviso de «Solicitud cancelada» salía detrás de la ficha. */
  const modal = useSyncExternalStore(
    suscribirCapaSuperior,
    modalSuperior,
    () => null,
  );
  const descartar = useCallback((id: number) => {
    setAvisos((previos) => previos.filter((aviso) => aviso.id !== id));
  }, []);

  const avisar = useCallback(
    (mensaje: string, tono: TonoAviso = "info") => {
      const id = siguienteId.current++;
      setAvisos((previos) => [...previos, { id, tono, mensaje }]);
      window.setTimeout(() => descartar(id), DURACION[tono]);
    },
    [descartar],
  );

  const confirmar = useCallback(
    (opciones: OpcionesConfirmacion) =>
      new Promise<boolean>((resolver) => {
        setPendiente({ opciones, resolver });
      }),
    [],
  );

  const responder = useCallback(
    (respuesta: boolean) => {
      pendiente?.resolver(respuesta);
      setPendiente(null);
    },
    [pendiente],
  );

  /* Y además como popover: así entran ellos mismos en la capa superior, por
     encima del modal y sin quedar recortados por él. Se vuelve a mostrar con
     cada aviso nuevo o cambio de modal para quedar al frente de lo último que
     se abrió. Donde el navegador no tenga popover, sigue valiendo el z-index. */
  useLayoutEffect(() => {
    const pila = refPila.current;
    if (!pila || typeof pila.showPopover !== "function") return;
    try {
      if (pila.matches(":popover-open")) pila.hidePopover();
      if (avisos.length > 0) pila.showPopover();
    } catch {
      // Un popover desconectado del documento lanza; no hay nada que mostrar
    }
  }, [avisos, modal]);

  const valor = useMemo<ValorAvisos>(
    () => ({ avisar, confirmar }),
    [avisar, confirmar],
  );

  return (
    <ContextoAvisos value={valor}>
      {children}

      {/* aria-live polite: el aviso se anuncia al terminar lo que el lector esté
      {   leyendo, en vez de interrumpir a media frase. Los errores del
      {   formulario, que sí exigen atención inmediata, usan role de alerta en su
      {   propio campo. */}
      {createPortal(
      <div
        ref={refPila}
        className={estilos.pila}
        popover="manual"
        aria-live="polite"
        aria-atomic="false"
      >
        {avisos.map((aviso) => (
          <div key={aviso.id} className={estilos.aviso + " " + estilos[aviso.tono]}>
            <span className={estilos.tono}>{PALABRA[aviso.tono]}</span>
            <span className={estilos.mensaje}>{aviso.mensaje}</span>
            <button
              type="button"
              className={estilos.cerrar}
              onClick={() => descartar(aviso.id)}
              aria-label="Descartar aviso"
            >
              &times;
            </button>
          </div>
        ))}
      </div>,
        modal ?? document.body,
      )}

      <Modal
        abierto={pendiente !== null}
        onCerrar={() => responder(false)}
        titulo={pendiente?.opciones.titulo ?? ""}
        pie={
          <GrupoBotones>
            <Boton variante="terciaria" onClick={() => responder(false)}>
              {pendiente?.opciones.textoCancelar ?? "Cancelar"}
            </Boton>
            <Boton
              variante={pendiente?.opciones.destructiva ? "rechazar" : "primaria"}
              onClick={() => responder(true)}
            >
              {pendiente?.opciones.textoConfirmar ?? "Confirmar"}
            </Boton>
          </GrupoBotones>
        }
      >
        <p className={estilos.textoConfirmacion}>{pendiente?.opciones.mensaje}</p>
      </Modal>
    </ContextoAvisos>
  );
}
