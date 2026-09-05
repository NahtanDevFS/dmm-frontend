import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoAreaTexto } from "../../componentes/ui/Campo";
import SubidaArchivo from "../../componentes/ui/SubidaArchivo";
import { EstadoVacio } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { urlArchivo } from "../../lib/archivos";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_ENTREGAS,
  subirEvidencia,
  eliminarEvidencia,
  type EvidenciaEntrega,
} from "../../api/entregas";
import type { ElementoCatalogo } from "../../types/api";
import estilos from "./Entregas.module.css";

/**
 * Evidencias de entrega: la constancia de que el despacho ocurrió — firma,
 * foto, acta. Misma baja lógica que recetas y documentos de recepción: el
 * archivo se conserva en el servidor aunque se quite de la lista.
 */
function SeccionEvidencias({
  entregaId,
  evidencias,
  onBorrador,
}: {
  entregaId: number;
  evidencias: EvidenciaEntrega[];
  /** Avisa a la ficha de si hay un adjunto elegido y todavía sin subir. */
  onBorrador?: (hay: boolean) => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipoId, setTipoId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const tipos = useCatalogo<ElementoCatalogo>("tipos-evidencia-entrega");

  const marcarBorrador = (siguiente: {
    archivo?: File | null;
    tipoId?: string;
    observaciones?: string;
  }) => {
    const a = "archivo" in siguiente ? siguiente.archivo! : archivo;
    const t = siguiente.tipoId ?? tipoId;
    const o = siguiente.observaciones ?? observaciones;
    onBorrador?.(a !== null || t !== "" || o.trim() !== "");
  };

  const refrescar = () =>
    clienteQuery.invalidateQueries({
      queryKey: [CLAVE_ENTREGAS, entregaId],
    });

  const subida = useMutation({
    mutationFn: () =>
      subirEvidencia(entregaId, {
        archivo: archivo as File,
        tipoEvidenciaId: Number(tipoId),
        observaciones: observaciones.trim() || undefined,
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Evidencia adjuntada.", "exito");
      setArchivo(null);
      setTipoId("");
      setObservaciones("");
      onBorrador?.(false);
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const borrado = useMutation({
    mutationFn: (evidenciaId: number) =>
      eliminarEvidencia(entregaId, evidenciaId),
    onSuccess: async () => {
      await refrescar();
      avisar("Evidencia eliminada.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const nombreTipo = (tipoEvidenciaId: number) =>
    tipos.opciones.find((t) => t.id === tipoEvidenciaId)?.nombre ?? "Evidencia";

  const nombreDe = (evidencia: EvidenciaEntrega) =>
    evidencia.observaciones ??
    nombreTipo(evidencia.tipo_evidencia_id) +
      " — " +
      (evidencia.ruta_archivo.split("/").pop() ?? "");

  const listoParaSubir = archivo !== null && tipoId !== "";

  return (
    <section className={estilos.tarjeta} aria-labelledby="ent-evidencias">
      <div className={estilos.tituloTarjeta}>
        <h2 id="ent-evidencias">Evidencias de entrega</h2>
      </div>

      <p className={estilos.nota}>
        Constancia de que el despacho ocurrió: firma, fotografía, acta. Se abren
        de una en una y solo con la sesión iniciada.
      </p>

      {evidencias.length === 0 ? (
        <EstadoVacio
          titulo="Sin evidencias"
          texto="Adjunte una con el formulario de abajo."
        />
      ) : (
        <div className={estilos.listaDocumentos}>
          {evidencias.map((evidencia) => (
            <div key={evidencia.id} className={estilos.documento}>
              <div>
                <p className={estilos.documentoNombre}>{nombreDe(evidencia)}</p>
                <p className={estilos.auxiliar}>
                  {nombreTipo(evidencia.tipo_evidencia_id)}
                </p>
              </div>
              <div className={estilos.acciones}>
                <a
                  href={urlArchivo(evidencia.ruta_archivo)}
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
                      titulo: "Eliminar evidencia",
                      mensaje:
                        "Se quitará «" +
                        nombreDe(evidencia) +
                        "» de esta entrega. El archivo permanece en el servidor: la baja es lógica.",
                      textoConfirmar: "Eliminar",
                      destructiva: true,
                    });
                    if (ok) borrado.mutate(evidencia.id);
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
            permitirCamara
          />
          <CampoSelect
            etiqueta="Tipo de evidencia"
            obligatorio
            value={tipoId}
            onChange={(e) => {
              setTipoId(e.target.value);
              marcarBorrador({ tipoId: e.target.value });
            }}
          >
            {tipos.opciones.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </CampoSelect>
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
          />
        </div>
        <div className={estilos.accionLote}>
          <Boton
            variante="secundaria"
            disabled={!listoParaSubir}
            cargando={subida.isPending}
            textoCargando="Subiendo…"
            onClick={() => subida.mutate()}
          >
            Adjuntar evidencia
          </Boton>
        </div>
      </div>
    </section>
  );
}

export default SeccionEvidencias;
