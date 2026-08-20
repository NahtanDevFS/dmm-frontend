import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import estilos from "./Campo.module.css";

interface PropsBase {
  etiqueta: string;
  obligatorio?: boolean;
  /** Texto de ayuda bajo el campo. Se oculta cuando hay error, para no competir. */
  ayuda?: string;
  error?: string;
  className?: string;
}

/**
 * Envoltura común: etiqueta, control, ayuda y error, con los identificadores
 * ya enlazados.
 *
 * El enlace es lo que justifica que exista: `htmlFor`, `aria-describedby` y
 * `aria-invalid` son fáciles de olvidar campo por campo, y sin ellos el lector
 * de pantalla anuncia un input sin nombre y un error que nadie oye.
 */
function useCampo({ obligatorio, ayuda, error }: PropsBase) {
  const id = useId();
  const idAyuda = ayuda ? id + "-ayuda" : undefined;
  const idError = error ? id + "-error" : undefined;

  return {
    id,
    idAyuda,
    idError,
    propsControl: {
      id,
      required: obligatorio,
      "aria-invalid": error ? ("true" as const) : undefined,
      // El error manda sobre la ayuda: si se anuncian los dos, el mensaje que
      // importa queda enterrado.
      "aria-describedby": idError ?? idAyuda,
    },
  };
}

function Envoltura({
  etiqueta,
  obligatorio,
  ayuda,
  error,
  className,
  id,
  idAyuda,
  idError,
  children,
}: PropsBase & {
  id: string;
  idAyuda?: string;
  idError?: string;
  children: ReactNode;
}) {
  return (
    <div className={[estilos.campo, className ?? ""].filter(Boolean).join(" ")}>
      <label className={estilos.etiqueta} htmlFor={id}>
        {etiqueta}
        {obligatorio && (
          <>
            <span className={estilos.obligatorio} aria-hidden="true">
              *
            </span>
            <span className="solo-lectores"> (obligatorio)</span>
          </>
        )}
      </label>
      {children}
      {error ? (
        <p id={idError} className={estilos.error}>
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className={estilos.ayuda}>
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

type PropsTexto = PropsBase &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "required"> & {
    /** Monoespaciada: CUI/DPI, códigos de lote, folios. */
    identificador?: boolean;
    /** Alineado a la derecha y con cifras tabulares. */
    numerico?: boolean;
    /** Solo lectura y en gris tintado: se lee como resultado, no como entrada. */
    calculado?: boolean;
    /** Control adjunto a la derecha: «+ Nueva», «Buscar». */
    accion?: ReactNode;
  };

export function CampoTexto({
  etiqueta,
  obligatorio,
  ayuda,
  error,
  className,
  identificador,
  numerico,
  calculado,
  accion,
  ...resto
}: PropsTexto) {
  const base = { etiqueta, obligatorio, ayuda, error, className };
  const { id, idAyuda, idError, propsControl } = useCampo(base);

  const input = (
    <input
      className={[
        estilos.control,
        identificador ? estilos.identificador : "",
        numerico ? estilos.numerico : "",
        calculado ? estilos.calculado : "",
      ]
        .filter(Boolean)
        .join(" ")}
      readOnly={calculado || resto.readOnly}
      // Un campo calculado no debe recibir foco al tabular: no hay nada que
      // hacer en él y solo alarga el recorrido del formulario.
      tabIndex={calculado ? -1 : resto.tabIndex}
      {...propsControl}
      {...resto}
    />
  );

  return (
    <Envoltura {...base} id={id} idAyuda={idAyuda} idError={idError}>
      {accion ? (
        <div className={estilos.conAccion}>
          {input}
          {accion}
        </div>
      ) : (
        input
      )}
    </Envoltura>
  );
}

type PropsSelect = PropsBase &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "required"> & {
    /** Texto de la opción vacía. Se omite en un select ya resuelto. */
    marcador?: string;
    accion?: ReactNode;
    children: ReactNode;
  };

export function CampoSelect({
  etiqueta,
  obligatorio,
  ayuda,
  error,
  className,
  marcador = "Seleccione…",
  accion,
  children,
  ...resto
}: PropsSelect) {
  const base = { etiqueta, obligatorio, ayuda, error, className };
  const { id, idAyuda, idError, propsControl } = useCampo(base);

  const select = (
    <select
      className={estilos.control + " " + estilos.select}
      {...propsControl}
      {...resto}
    >
      <option value="">{marcador}</option>
      {children}
    </select>
  );

  return (
    <Envoltura {...base} id={id} idAyuda={idAyuda} idError={idError}>
      {accion ? (
        <div className={estilos.conAccion}>
          {select}
          {accion}
        </div>
      ) : (
        select
      )}
    </Envoltura>
  );
}

type PropsAreaTexto = PropsBase &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "required">;

export function CampoAreaTexto({
  etiqueta,
  obligatorio,
  ayuda,
  error,
  className,
  ...resto
}: PropsAreaTexto) {
  const base = { etiqueta, obligatorio, ayuda, error, className };
  const { id, idAyuda, idError, propsControl } = useCampo(base);

  return (
    <Envoltura {...base} id={id} idAyuda={idAyuda} idError={idError}>
      <textarea
        className={estilos.control + " " + estilos.areaTexto}
        {...propsControl}
        {...resto}
      />
    </Envoltura>
  );
}
