import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto } from "../../componentes/ui/Campo";
import SubidaArchivo from "../../componentes/ui/SubidaArchivo";
import { EstadoVacio } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { urlArchivo } from "../../lib/archivos";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_RECEPCIONES,
  eliminarDocumentoRecepcion,
  subirDocumentoRecepcion,
  type DocumentoRecepcion,
} from "../../api/donaciones";
import estilos from "./Donaciones.module.css";

/**
 * Documentos de respaldo de la recepción: el acta de entrega, la carta de la
 * institución, la factura o la fotografía de la descarga.
 *
 * Es lo que sostiene la donación ante una auditoría, así que la baja es lógica
 * —el archivo permanece en el servidor— y se dice al confirmar. Tampoco se
 * previsualizan: se abren de uno en uno, con la sesión iniciada, igual que los
 * documentos de identificación del beneficiario.
 */
function SeccionDocumentosRecepcion({
  recepcionId,
  documentos,
}: {
  recepcionId: number;
  documentos: DocumentoRecepcion[];
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [descripcion, setDescripcion] = useState("");

  const refrescar = () =>
    clienteQuery.invalidateQueries({
      queryKey: [CLAVE_RECEPCIONES, recepcionId],
    });

  const subida = useMutation({
    mutationFn: () =>
      subirDocumentoRecepcion(recepcionId, {
        archivo: archivo as File,
        descripcion: descripcion.trim() || undefined,
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Documento adjuntado.", "exito");
      setArchivo(null);
      setDescripcion("");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const borrado = useMutation({
    mutationFn: (documentoId: number) =>
      eliminarDocumentoRecepcion(recepcionId, documentoId),
    onSuccess: async () => {
      await refrescar();
      avisar("Documento eliminado.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  /** Nombre del archivo en disco, cuando no se escribió una descripción. */
  const nombreDe = (documento: DocumentoRecepcion) =>
    documento.descripcion ??
    documento.ruta_archivo.split("/").pop() ??
    "Documento";

  return (
    <section className={estilos.tarjeta} aria-labelledby="don-documentos">
      <div className={estilos.tituloTarjeta}>
        <h2 id="don-documentos">Documentos de respaldo</h2>
      </div>

      <p className={estilos.nota}>
        Acta de entrega, carta de la institución, factura o fotografía de la
        descarga. Se abren de uno en uno y solo con la sesión iniciada: no se
        previsualizan aquí.
      </p>

      {documentos.length === 0 ? (
        <EstadoVacio
          titulo="Sin documentos"
          texto="Adjunte el respaldo de la donación con el formulario de abajo."
        />
      ) : (
        <div className={estilos.listaDocumentos}>
          {documentos.map((documento) => (
            <div key={documento.id} className={estilos.documento}>
              <p className={estilos.documentoNombre}>{nombreDe(documento)}</p>
              <div className={estilos.acciones}>
                <a
                  href={urlArchivo(documento.ruta_archivo)}
                  target="_blank"
                  rel="noreferrer"
                >
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
                      titulo: "Eliminar documento",
                      mensaje:
                        "Se quitará «" +
                        nombreDe(documento) +
                        "» del respaldo de esta donación. El archivo permanece en el servidor: la baja es lógica.",
                      textoConfirmar: "Eliminar",
                      destructiva: true,
                    });
                    if (ok) borrado.mutate(documento.id);
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
            onCambiar={setArchivo}
            disabled={subida.isPending}
          />
          <CampoTexto
            etiqueta="Descripción"
            maxLength={255}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            ayuda="Cómo se llama el documento: «Acta de entrega», «Factura 4471». Sin ella se muestra el nombre del archivo."
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
            Adjuntar documento
          </Boton>
        </div>
      </div>
    </section>
  );
}

export default SeccionDocumentosRecepcion;
