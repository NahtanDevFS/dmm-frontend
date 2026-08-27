import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto, CampoAreaTexto } from "../../componentes/ui/Campo";
import SubidaArchivo from "../../componentes/ui/SubidaArchivo";
import { EstadoVacio } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { urlArchivo } from "../../lib/archivos";
import { fechaDeHoy, formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_SOLICITUDES,
  subirReceta,
  eliminarReceta,
  type RecetaMedica,
} from "../../api/solicitudes";
import estilos from "./Solicitudes.module.css";

/**
 * Recetas médicas que respaldan la solicitud: lo que exige fn_validar_stock
 * cuando una línea pide un medicamento y trabajo social necesita constancia
 * de prescripción.
 *
 * Misma baja lógica que los documentos de una recepción: el archivo se
 * conserva en el servidor aunque se quite de la lista, porque es evidencia
 * de por qué se autorizó (o no) un medicamento.
 */
function SeccionRecetas({
  solicitudId,
  recetas,
  onBorrador,
}: {
  solicitudId: number;
  recetas: RecetaMedica[];
  /** Avisa a la ficha de si hay un adjunto elegido y todavía sin subir. */
  onBorrador?: (hay: boolean) => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [fechaEmision, setFechaEmision] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const marcarBorrador = (siguiente: {
    archivo?: File | null;
    fechaEmision?: string;
    observaciones?: string;
  }) => {
    const a = "archivo" in siguiente ? siguiente.archivo! : archivo;
    const f = siguiente.fechaEmision ?? fechaEmision;
    const o = siguiente.observaciones ?? observaciones;
    onBorrador?.(a !== null || f.trim() !== "" || o.trim() !== "");
  };

  const refrescar = () =>
    clienteQuery.invalidateQueries({
      queryKey: [CLAVE_SOLICITUDES, solicitudId],
    });

  const subida = useMutation({
    mutationFn: () =>
      subirReceta(solicitudId, {
        archivo: archivo as File,
        fechaEmision: fechaEmision || undefined,
        observaciones: observaciones.trim() || undefined,
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Receta adjuntada.", "exito");
      setArchivo(null);
      setFechaEmision("");
      setObservaciones("");
      onBorrador?.(false);
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const borrado = useMutation({
    mutationFn: (recetaId: number) => eliminarReceta(solicitudId, recetaId),
    onSuccess: async () => {
      await refrescar();
      avisar("Receta eliminada.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const nombreDe = (receta: RecetaMedica) =>
    receta.observaciones ?? receta.ruta_archivo.split("/").pop() ?? "Receta";

  return (
    <section className={estilos.tarjeta} aria-labelledby="sol-recetas">
      <div className={estilos.tituloTarjeta}>
        <h2 id="sol-recetas">Recetas médicas</h2>
      </div>

      <p className={estilos.nota}>
        Respaldo de las líneas que piden medicamentos. Se abren de una en una y
        solo con la sesión iniciada: no se previsualizan aquí.
      </p>

      {recetas.length === 0 ? (
        <EstadoVacio
          titulo="Sin recetas"
          texto="Adjunte la receta con el formulario de abajo, si el trámite incluye medicamentos."
        />
      ) : (
        <div className={estilos.listaDocumentos}>
          {recetas.map((receta) => (
            <div key={receta.id} className={estilos.documento}>
              <div>
                <p className={estilos.documentoNombre}>{nombreDe(receta)}</p>
                {receta.fecha_emision && (
                  <p className={estilos.auxiliar}>
                    Emitida el {formatearFecha(receta.fecha_emision)}
                  </p>
                )}
              </div>
              <div className={estilos.acciones}>
                href={urlArchivo(receta.ruta_archivo)}
                target="_blank" rel="noreferrer"
                <a>
                  <Boton pequeno variante="secundaria">
                    Abrir
                  </Boton>
                </a>
                <Boton
                  pequeno
                  variante="terciaria"
                  cargando={borrado.isPending}
                  onClick={async () => {
                    const ok = await confirmar({
                      titulo: "Eliminar receta",
                      mensaje:
                        "Se quitará «" +
                        nombreDe(receta) +
                        "» del respaldo de esta solicitud. El archivo permanece en el servidor: la baja es lógica.",
                      textoConfirmar: "Eliminar",
                      destructiva: true,
                    });
                    if (ok) borrado.mutate(receta.id);
                  }}
                >
                  Eliminar
                </Boton>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={estilos.formularioLote}>
        <div className={estilos.rejillaLote}>
          <SubidaArchivo
            etiqueta="Archivo"
            obligatorio
            archivo={archivo}
            onCambiar={(nuevo) => {
              setArchivo(nuevo);
              marcarBorrador({ archivo: nuevo });
            }}
            disabled={subida.isPending}
          />
          <CampoTexto
            etiqueta="Fecha de emisión"
            type="date"
            max={fechaDeHoy()}
            value={fechaEmision}
            onChange={(e) => {
              setFechaEmision(e.target.value);
              marcarBorrador({ fechaEmision: e.target.value });
            }}
          />
          <CampoAreaTexto
            className={estilos.anchoCompleto}
            etiqueta="Observaciones"
            rows={2}
            maxLength={2000}
            value={observaciones}
            onChange={(e) => {
              setObservaciones(e.target.value);
              marcarBorrador({ observaciones: e.target.value });
            }}
            ayuda="Qué medicamento respalda o quién la emitió. Sin ella se muestra el nombre del archivo."
          />
        </div>
        <div className={estilos.accionLote}>
          <Boton
            variante="secundaria"
            disabled={!archivo}
            cargando={subida.isPending}
            textoCargando="Subiendo…"
            onClick={() => subida.mutate()}
          >
            Adjuntar receta
          </Boton>
        </div>
      </div>
    </section>
  );
}

export default SeccionRecetas;
