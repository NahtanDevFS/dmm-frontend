import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import SubidaArchivo from "../../componentes/ui/SubidaArchivo";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_PERSONAS,
  eliminarDocumento,
  listarDocumentos,
  subirDocumento,
  urlArchivo,
} from "../../api/personas";
import type { ElementoCatalogo } from "../../types/api";
import estilos from "./Ficha.module.css";

/**
 * Documentos de identificación del beneficiario.
 *
 * Es el bloque con los datos más sensibles de la ficha: fotografías de DPI y
 * partidas de nacimiento. Los archivos se sirven tras la sesión, así que no
 * se muestran en línea ni se previsualizan; se abren a propósito, uno a uno.
 */
function SeccionDocumentos({ personaId }: { personaId: number }) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();
  const tipos = useCatalogo<ElementoCatalogo>("tipos-documento-persona");

  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipoId, setTipoId] = useState("");
  const [numero, setNumero] = useState("");

  const consulta = useQuery({
    queryKey: [CLAVE_PERSONAS, personaId, "documentos"],
    queryFn: () => listarDocumentos(personaId),
  });

  const refrescar = () =>
    clienteQuery.invalidateQueries({
      queryKey: [CLAVE_PERSONAS, personaId, "documentos"],
    });

  const subida = useMutation({
    mutationFn: () =>
      subirDocumento(personaId, {
        archivo: archivo as File,
        tipoDocumentoId: Number(tipoId),
        numeroDocumento: numero.trim() || undefined,
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Documento subido.", "exito");
      setArchivo(null);
      setTipoId("");
      setNumero("");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const borrado = useMutation({
    mutationFn: (documentoId: number) =>
      eliminarDocumento(personaId, documentoId),
    onSuccess: async () => {
      await refrescar();
      avisar("Documento eliminado.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const nombreTipo = (id: number) =>
    tipos.opciones.find((t) => t.id === id)?.nombre ?? "Documento";

  return (
    <section
      className={estilos.tarjeta + " " + estilos.tarjetaSensible}
      aria-labelledby="f-documentos"
    >
      <div className={estilos.tituloTarjeta}>
        <h2 id="f-documentos">Documentos de identificación</h2>
      </div>
      <p className={estilos.nota}>
        Los archivos solo se pueden abrir con la sesión iniciada. No se
        previsualizan aquí: se abren de uno en uno, a propósito.
      </p>

      {consulta.isPending ? (
        <p className={estilos.elementoDetalle}>Cargando documentos…</p>
      ) : consulta.isError ? (
        <p className={estilos.elementoDetalle}>
          {mensajeDeError(consulta.error)}
        </p>
      ) : consulta.data.length === 0 ? (
        <p className={estilos.elementoDetalle}>Ninguno registrado.</p>
      ) : (
        <div className={estilos.listaSimple}>
          {consulta.data.map((documento) => (
            <div key={documento.id} className={estilos.elemento}>
              <div className={estilos.elementoTexto}>
                <p className={estilos.elementoNombre}>
                  {nombreTipo(documento.tipo_documento_id)}
                </p>
                <p className={estilos.elementoDetalle}>
                  {documento.numero_documento ?? "Sin número"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                {documento.ruta_archivo && (
                  <a
                    href={urlArchivo(documento.ruta_archivo)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Boton pequeno variante="secundaria">
                      Abrir
                    </Boton>
                  </a>
                )}
                <Boton
                  pequeno
                  variante="terciaria"
                  cargando={borrado.isPending}
                  onClick={async () => {
                    const ok = await confirmar({
                      titulo: "Eliminar documento",
                      mensaje:
                        "Se quitará «" +
                        nombreTipo(documento.tipo_documento_id) +
                        "» de la ficha. El archivo permanece en el servidor: la baja es lógica.",
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

      <div className={estilos.formularioEnLinea}>
        <CampoSelect
          etiqueta="Tipo de documento"
          obligatorio
          value={tipoId}
          onChange={(e) => setTipoId(e.target.value)}
        >
          {tipos.opciones.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </CampoSelect>
        <CampoTexto
          etiqueta="Número"
          identificador
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
        <SubidaArchivo
          etiqueta="Archivo"
          obligatorio
          archivo={archivo}
          onCambiar={setArchivo}
          disabled={subida.isPending}
        />
        <Boton
          variante="secundaria"
          disabled={!archivo || !tipoId}
          cargando={subida.isPending}
          textoCargando="Subiendo…"
          onClick={() => subida.mutate()}
        >
          Subir documento
        </Boton>
      </div>
    </section>
  );
}

export default SeccionDocumentos;
