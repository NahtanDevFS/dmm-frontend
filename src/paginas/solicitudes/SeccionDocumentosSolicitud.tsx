import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import SubidaArchivo from "../../componentes/ui/SubidaArchivo";
import { EstadoVacio } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { urlArchivo } from "../../lib/archivos";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_SOLICITUDES,
  subirDocumentoSolicitud,
  eliminarDocumentoSolicitud,
  type DocumentoSolicitud,
} from "../../api/solicitudes";
import { CLAVE_FORMULARIOS, listarFormularios } from "../../api/formularios";
import estilos from "./Solicitudes.module.css";

/**
 * El legajo escaneado de la solicitud.
 *
 * Reemplaza a la sección de recetas médicas, que era residuo del diseño
 * viejo: la tabla receta_medica nació cuando la medicina pasaba por
 * solicitud, y con el flujo actual la receta se sube como evidencia de la
 * entrega directa. Aquella sección aparecía en toda solicitud, incluidas las
 * de silla de ruedas, donde no tiene ningún sentido.
 *
 * Aquí cabe cualquier respaldo en papel, y por eso se enumeran arriba los
 * casos habituales: sin esa pista, una sección llamada solo «Documentos» no
 * le dice a nadie qué se espera que suba.
 *
 * Identificar a qué formulario corresponde cada escaneo es opcional: hay
 * documentos del legajo que no son ninguno de los formularios, y obligar a
 * clasificar empuja a elegir cualquiera con tal de poder guardar.
 */
function SeccionDocumentosSolicitud({
  solicitudId,
  documentos,
  onBorrador,
}: {
  solicitudId: number;
  documentos: DocumentoSolicitud[];
  /** Avisa a la ficha de si hay un adjunto elegido y todavía sin subir. */
  onBorrador?: (hay: boolean) => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [formularioId, setFormularioId] = useState("");

  const formularios = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "lista"],
    queryFn: listarFormularios,
  });

  const nombreFormulario = (id: number | null) =>
    id === null
      ? null
      : (formularios.data?.find((f) => f.id === id)?.nombre ?? null);

  const marcarBorrador = (siguiente: {
    archivo?: File | null;
    descripcion?: string;
  }) => {
    const a = "archivo" in siguiente ? siguiente.archivo! : archivo;
    const d = siguiente.descripcion ?? descripcion;
    onBorrador?.(a !== null || d.trim() !== "");
  };

  const refrescar = () =>
    clienteQuery.invalidateQueries({
      queryKey: [CLAVE_SOLICITUDES, solicitudId],
    });

  const subida = useMutation({
    mutationFn: () =>
      subirDocumentoSolicitud(solicitudId, {
        archivo: archivo as File,
        formularioId: formularioId ? Number(formularioId) : undefined,
        descripcion: descripcion.trim() || undefined,
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Documento adjuntado.", "exito");
      setArchivo(null);
      setDescripcion("");
      setFormularioId("");
      onBorrador?.(false);
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const borrado = useMutation({
    mutationFn: (documentoId: number) =>
      eliminarDocumentoSolicitud(solicitudId, documentoId),
    onSuccess: async () => {
      await refrescar();
      avisar("Documento eliminado.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const nombreDe = (documento: DocumentoSolicitud) =>
    documento.descripcion ??
    nombreFormulario(documento.formulario_id) ??
    documento.ruta_archivo.split("/").pop() ??
    "Documento";

  return (
    <section className={estilos.tarjeta} aria-labelledby="sol-documentos">
      <div className={estilos.tituloTarjeta}>
        <h2 id="sol-documentos">Documentos adjuntos</h2>
      </div>

      <p className={estilos.nota}>
        El respaldo en papel de este trámite: formularios firmados, hojas de
        firma, recetas médicas, constancias o cualquier otro documento. Se abren
        de uno en uno y solo con la sesión iniciada: no se previsualizan aquí.
      </p>

      {documentos.length === 0 ? (
        <EstadoVacio
          titulo="Sin documentos"
          texto="Adjunte con el formulario de abajo los papeles que respaldan esta solicitud."
        />
      ) : (
        <div className={estilos.listaDocumentos}>
          {documentos.map((documento) => (
            <div key={documento.id} className={estilos.documento}>
              <div>
                <p className={estilos.documentoNombre}>{nombreDe(documento)}</p>
                {documento.formulario_id !== null && (
                  <p className={estilos.auxiliar}>
                    Corresponde a: {nombreFormulario(documento.formulario_id)}
                  </p>
                )}
              </div>
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
                        "» del legajo de esta solicitud. El archivo permanece en el servidor: la baja es lógica, porque pudo respaldar una aprobación que ya ocurrió.",
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
            onCambiar={(nuevo) => {
              setArchivo(nuevo);
              marcarBorrador({ archivo: nuevo });
            }}
            disabled={subida.isPending}
          />
          <CampoTexto
            etiqueta="Descripción"
            maxLength={255}
            value={descripcion}
            onChange={(e) => {
              setDescripcion(e.target.value);
              marcarBorrador({ descripcion: e.target.value });
            }}
            ayuda="Cómo reconocerlo después. Ejemplo: «Estudio socioeconómico firmado»."
          />
          <CampoSelect
            etiqueta="Corresponde al formulario"
            value={formularioId}
            onChange={(e) => setFormularioId(e.target.value)}
            ayuda="Opcional. Déjelo en blanco si no es ninguno de ellos."
          >
            {formularios.data?.map((formulario) => (
              <option key={formulario.id} value={formulario.id}>
                {formulario.nombre}
              </option>
            ))}
          </CampoSelect>
        </div>

        <Boton
          variante="secundaria"
          disabled={archivo === null}
          cargando={subida.isPending}
          textoCargando="Subiendo…"
          onClick={() => subida.mutate()}
        >
          Adjuntar documento
        </Boton>
      </div>
    </section>
  );
}

export default SeccionDocumentosSolicitud;
