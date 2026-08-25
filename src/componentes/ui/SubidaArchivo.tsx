import { useId, useRef, useState, type DragEvent } from "react";
import {
  EXTENSIONES_ACEPTADAS,
  TAMANO_MAXIMO,
  TIPOS_ACEPTADOS,
  formatearPeso,
} from "../../lib/archivos";
import estilos from "./SubidaArchivo.module.css";

interface PropsSubida {
  etiqueta: string;
  obligatorio?: boolean;
  ayuda?: string;
  error?: string;
  archivo: File | null;
  onCambiar: (archivo: File | null) => void;
  disabled?: boolean;
}

/**
 * Selector de un archivo para las subidas del sistema: documentos de
 * identificación, respaldos de recepción, recetas y evidencias de entrega.
 *
 * Valida tamaño y tipo antes de enviar, pero eso es cortesía, no seguridad: el
 * servidor comprueba la firma binaria del archivo y no su extensión, así que
 * un .pdf renombrado será rechazado allí aunque aquí parezca válido. Se avisa
 * en la ayuda para que un rechazo del servidor no parezca un fallo del sistema.
 */
function SubidaArchivo({
  etiqueta,
  obligatorio,
  ayuda,
  error,
  archivo,
  onCambiar,
  disabled,
}: PropsSubida) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const mensaje = error ?? errorLocal;

  const aceptar = (candidato: File | undefined) => {
    if (!candidato) return;

    if (candidato.size > TAMANO_MAXIMO) {
      setErrorLocal(
        "El archivo pesa " +
          formatearPeso(candidato.size) +
          " y el máximo son 8 MB.",
      );
      return;
    }
    if (!TIPOS_ACEPTADOS.includes(candidato.type)) {
      setErrorLocal("Solo se admiten archivos JPG, PNG, WEBP o PDF.");
      return;
    }

    setErrorLocal(null);
    onCambiar(candidato);
  };

  const alSoltar = (evento: DragEvent<HTMLLabelElement>) => {
    evento.preventDefault();
    setArrastrando(false);
    if (disabled) return;
    aceptar(evento.dataTransfer.files[0]);
  };

  const quitar = () => {
    setErrorLocal(null);
    onCambiar(null);
    // El input nativo conserva el archivo aunque el estado se limpie, y sin
    // esto no se dispararía change al volver a elegir el mismo archivo.
    if (entrada.current) entrada.current.value = "";
  };

  return (
    <div className={estilos.campo}>
      {/*
        Rótulo en un <span> y no en un <label for>. La zona de arrastre ya es
        un label de este mismo input —es lo que hace que al pulsarla se abra el
        selector sin JavaScript—, y dos labels sobre el mismo control dan un
        nombre accesible concatenado («Archivo (obligatorio) Seleccione un
        archivo o arrástrelo aquí») y hacen que pulsar el rótulo abra el
        selector, que no es lo que un rótulo promete. El nombre correcto se fija
        con aria-labelledby, que tiene prioridad sobre los label.
      */}
      <span className={estilos.etiqueta} id={id + "-titulo"}>
        {etiqueta}
        {obligatorio && (
          <>
            <span className={estilos.obligatorio} aria-hidden="true">
              *
            </span>
            <span className="solo-lectores"> (obligatorio)</span>
          </>
        )}
      </span>

      {archivo ? (
        <div className={estilos.elegido}>
          <span className={estilos.nombre} title={archivo.name}>
            {archivo.name}
          </span>
          <span className={estilos.peso}>{formatearPeso(archivo.size)}</span>
          <button
            type="button"
            className={estilos.quitar}
            onClick={quitar}
            disabled={disabled}
            aria-label={"Quitar el archivo " + archivo.name}
          >
            Quitar
          </button>
        </div>
      ) : (
        <>
          <input
            ref={entrada}
            id={id}
            type="file"
            className={estilos.entrada}
            accept={EXTENSIONES_ACEPTADAS}
            disabled={disabled}
            aria-labelledby={id + "-titulo"}
            aria-invalid={mensaje ? "true" : undefined}
            aria-describedby={mensaje ? id + "-error" : id + "-ayuda"}
            onChange={(evento) => aceptar(evento.target.files?.[0])}
          />
          <label
            htmlFor={id}
            className={[
              estilos.zona,
              arrastrando ? estilos.zonaArrastre : "",
              mensaje ? estilos.zonaInvalida : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
          >
            {arrastrando
              ? "Suelte el archivo aquí"
              : "Seleccione un archivo o arrástrelo aquí"}
          </label>
        </>
      )}

      {mensaje ? (
        <p id={id + "-error"} className={estilos.error}>
          {mensaje}
        </p>
      ) : (
        <p id={id + "-ayuda"} className={estilos.ayuda}>
          {ayuda ? ayuda + " " : ""}
          JPG, PNG, WEBP o PDF, hasta 8 MB. El servidor comprueba el contenido
          real del archivo, no su extensión, así que renombrarlo no sirve.
        </p>
      )}
    </div>
  );
}

export default SubidaArchivo;
