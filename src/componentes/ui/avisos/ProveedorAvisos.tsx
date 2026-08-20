import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import Boton, { GrupoBotones } from "../Boton";
import Modal from "../Modal";
import {
  ContextoAvisos,
  type Aviso,
  type OpcionesConfirmacion,
  type TonoAviso,
  type ValorAvisos,
} from "./contexto";
import estilos from "./Avisos.module.css";

/** Palabra que acompaña al color. El color nunca es la única señal. */
const PALABRA: Record<TonoAviso, string> = {
  exito: "Listo",
  error: "Error",
  advertencia: "Atención",
  info: "Aviso",
};

/** Un error se lee más despacio y suele necesitar copiarse o releerse. */
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

  const valor = useMemo<ValorAvisos>(
    () => ({ avisar, confirmar }),
    [avisar, confirmar],
  );

  return (
    <ContextoAvisos value={valor}>
      {children}

      {/**
       * aria-live polite: el aviso se anuncia al terminar lo que el lector esté
       * leyendo, en vez de interrumpir a media frase. Los errores del
       * formulario, que sí exigen atención inmediata, usan role de alerta en su
       * propio campo.
       */}
      <div className={estilos.pila} aria-live="polite" aria-atomic="false">
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
      </div>

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
