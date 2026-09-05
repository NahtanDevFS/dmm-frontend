import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import {
  EXTENSIONES_ACEPTADAS,
  TAMANO_MAXIMO,
  TIPOS_ACEPTADOS,
  formatearPeso,
  optimizarImagenCamara,
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
  permitirCamara?: boolean;
}

function SubidaArchivo({
  etiqueta,
  obligatorio,
  ayuda,
  error,
  archivo,
  onCambiar,
  disabled,
  permitirCamara = true,
}: PropsSubida) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [arrastrando, setArrastrando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Estados del visor de cámara en vivo
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [iniciandoCamara, setIniciandoCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([]);
  const [dispositivoActualId, setDispositivoActualId] = useState<string>("");

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

  const alSoltar = (evento: DragEvent<HTMLElement>) => {
    evento.preventDefault();
    setArrastrando(false);
    if (disabled) return;
    aceptar(evento.dataTransfer.files[0]);
  };

  const quitar = () => {
    setErrorLocal(null);
    onCambiar(null);
    if (entrada.current) entrada.current.value = "";
  };

  // Detener pistas de la cámara y liberar el hardware
  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const cerrarCamara = () => {
    detenerCamara();
    setCamaraAbierta(false);
    setFotoCapturada(null);
    setArchivoFoto(null);
    setErrorCamara(null);
  };

  // Iniciar flujo de video WebRTC
  const arrancarStream = async (deviceId?: string) => {
    detenerCamara();
    setIniciandoCamara(true);
    setErrorCamara(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "El navegador bloquea la cámara directa. Si estás en un teléfono o red local, se requiere HTTPS o localhost.",
        );
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Enumerar cámaras disponibles (frontal, trasera, etc.)
      const todos = await navigator.mediaDevices.enumerateDevices();
      const cams = todos.filter((d) => d.kind === "videoinput");
      setDispositivos(cams);

      const trackActual = stream.getVideoTracks()[0];
      const settings = trackActual?.getSettings();
      if (settings?.deviceId) {
        setDispositivoActualId(settings.deviceId);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorCamara(
          "Permiso denegado. Habilita el permiso de cámara en los ajustes del navegador.",
        );
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setErrorCamara("No se detectó ninguna cámara en este equipo.");
      } else if (err instanceof Error) {
        setErrorCamara(err.message);
      } else {
        setErrorCamara("No fue posible acceder a la cámara.");
      }
    } finally {
      setIniciandoCamara(false);
    }
  };

  const abrirCamara = () => {
    setCamaraAbierta(true);
    setFotoCapturada(null);
    setArchivoFoto(null);
    setErrorCamara(null);
    arrancarStream();
  };

  const cambiarLente = () => {
    if (dispositivos.length <= 1) return;
    const indiceActual = dispositivos.findIndex(
      (d) => d.deviceId === dispositivoActualId,
    );
    const siguienteIndice = (indiceActual + 1) % dispositivos.length;
    const siguienteId = dispositivos[siguienteIndice].deviceId;
    setDispositivoActualId(siguienteId);
    arrancarStream(siguienteId);
  };

  // Capturar fotograma sobre canvas y optimizar peso
  const capturarDisparo = () => {
    const video = videoRef.current;
    if (!video) return;

    const ancho = video.videoWidth || 1280;
    const alto = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, ancho, alto);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setFotoCapturada(dataUrl);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const archivoCrudo = new File([blob], `foto_${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        const fotoOptimizada = await optimizarImagenCamara(archivoCrudo);
        setArchivoFoto(fotoOptimizada);
      },
      "image/jpeg",
      0.82,
    );
  };

  const confirmarFoto = () => {
    if (archivoFoto) {
      aceptar(archivoFoto);
    }
    cerrarCamara();
  };

  const descartarFoto = () => {
    setFotoCapturada(null);
    setArchivoFoto(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  };

  // Apagar la cámara si el componente se desmonta inesperadamente
  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  return (
    <div className={estilos.campo}>
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

          {permitirCamara ? (
            <div
              className={[
                estilos.zona,
                estilos.zonaDoble,
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
              {arrastrando ? (
                "Suelte el archivo aquí"
              ) : (
                <div className={estilos.accionesZona}>
                  <button
                    type="button"
                    className={estilos.botonZona}
                    onClick={() => entrada.current?.click()}
                    disabled={disabled}
                  >
                    Seleccionar archivo
                  </button>
                  <span className={estilos.separadorZona} aria-hidden="true">
                    o
                  </span>
                  <button
                    type="button"
                    className={estilos.botonZona}
                    onClick={abrirCamara}
                    disabled={disabled}
                  >
                    Tomar foto
                  </button>
                </div>
              )}
            </div>
          ) : (
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
          )}
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

      {/* Modal interactivo con visor de cámara en vivo */}
      {camaraAbierta && (
        <div
          className={estilos.modalCamaraOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby={id + "-modal-camara-titulo"}
        >
          <div className={estilos.modalCamaraContenedor}>
            <div className={estilos.modalCamaraCabecera}>
              <h3
                id={id + "-modal-camara-titulo"}
                className={estilos.modalCamaraTitulo}
              >
                Capturar fotografía
              </h3>
              <button
                type="button"
                className={estilos.modalCamaraCerrar}
                onClick={cerrarCamara}
                aria-label="Cerrar visor de cámara"
              >
                ✕
              </button>
            </div>

            <div className={estilos.modalCamaraVisor}>
              {iniciandoCamara && (
                <div className={estilos.modalCamaraMensaje}>
                  Iniciando cámara…
                </div>
              )}

              {errorCamara && (
                <div className={estilos.modalCamaraError}>
                  <p>{errorCamara}</p>
                  <button
                    type="button"
                    className={estilos.botonZona}
                    onClick={() => arrancarStream()}
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {fotoCapturada ? (
                <img
                  src={fotoCapturada}
                  alt="Vista previa capturada"
                  className={estilos.modalCamaraPrevia}
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={[
                    estilos.modalCamaraVideo,
                    errorCamara || iniciandoCamara
                      ? estilos.modalCamaraOculto
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              )}
            </div>

            <div className={estilos.modalCamaraAcciones}>
              {fotoCapturada ? (
                <>
                  <button
                    type="button"
                    className={estilos.botonCamaraSecundario}
                    onClick={descartarFoto}
                  >
                    Tomar otra
                  </button>
                  <button
                    type="button"
                    className={estilos.botonCamaraPrimario}
                    onClick={confirmarFoto}
                  >
                    Usar foto
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={estilos.botonCamaraSecundario}
                    onClick={cerrarCamara}
                  >
                    Cancelar
                  </button>

                  {dispositivos.length > 1 && !errorCamara && (
                    <button
                      type="button"
                      className={estilos.botonCamaraSecundario}
                      onClick={cambiarLente}
                      title="Alternar entre cámara frontal y trasera"
                    >
                      Cambiar cámara
                    </button>
                  )}

                  {!errorCamara && !iniciandoCamara && (
                    <button
                      type="button"
                      className={estilos.botonCamaraPrimario}
                      onClick={capturarDisparo}
                    >
                      Capturar
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubidaArchivo;
