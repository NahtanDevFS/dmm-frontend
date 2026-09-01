import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Modal from "../../componentes/ui/Modal";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_FORMULARIOS,
  obtenerFormulario,
  obtenerRespuestas,
  guardarRespuestas,
  type FormularioCampo,
  type FormularioConCampos,
  type RespuestasFormulario,
  type DatosRespuesta,
} from "../../api/formularios";
import RenderizadorCampo from "./RenderizadorCampo";
import estilos from "./Formularios.module.css";

/** Valores de los campos sueltos: uno por campo (numero_fila siempre 1). */
type ValoresSueltos = Record<number, string | null>;

/** Valores de un grupo repetible: un array de filas, cada una campoId -> valor. */
type FilaGrupo = Record<number, string | null>;
type ValoresGrupos = Record<string, FilaGrupo[]>;

function agruparCampos(campos: FormularioCampo[]) {
  const sueltos = campos.filter((c) => !c.grupo_repetible);
  const grupos = new Map<string, FormularioCampo[]>();
  for (const campo of campos) {
    if (!campo.grupo_repetible) continue;
    const lista = grupos.get(campo.grupo_repetible) ?? [];
    lista.push(campo);
    grupos.set(campo.grupo_repetible, lista);
  }
  return { sueltos, grupos };
}

/** Nombre legible para un grupo repetible, a falta de un catálogo de nombres de grupo. */
function tituloDeGrupo(nombreGrupo: string): string {
  return nombreGrupo
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function filaVacia(camposDelGrupo: FormularioCampo[]): FilaGrupo {
  const fila: FilaGrupo = {};
  for (const c of camposDelGrupo) fila[c.id] = null;
  return fila;
}

/**
 * Estado inicial a partir de las respuestas ya guardadas (si las hay). Vive
 * fuera del componente para poder usarse como inicializador perezoso de
 * useState: así la precarga ocurre una sola vez, en el primer render, sin
 * useEffect ni setState posterior a montar.
 */
function estadoInicial(
  formulario: FormularioConCampos,
  respuestas: RespuestasFormulario,
  camposGrupos: Map<string, FormularioCampo[]>,
): { sueltos: ValoresSueltos; grupos: ValoresGrupos } {
  const sueltos: ValoresSueltos = {};
  const grupos: ValoresGrupos = {};
  const camposPorId = new Map(formulario.campos.map((c) => [c.id, c]));

  for (const r of respuestas.respuestas) {
    const campo = camposPorId.get(r.formulario_campo_id);
    if (!campo) continue;
    if (!campo.grupo_repetible) {
      sueltos[campo.id] = r.valor_texto;
    } else {
      const filas = grupos[campo.grupo_repetible] ?? [];
      while (filas.length < r.numero_fila) {
        filas.push(filaVacia(camposGrupos.get(campo.grupo_repetible) ?? []));
      }
      filas[r.numero_fila - 1][campo.id] = r.valor_texto;
      grupos[campo.grupo_repetible] = filas;
    }
  }

  return { sueltos, grupos };
}

/**
 * Formulario dinámico: renderiza cualquier configuración de formulario_campo
 * sin conocerla de antemano. Los campos sueltos van en una rejilla; los que
 * comparten grupo_repetible se agrupan en su propia tabla de filas, con
 * "+ Agregar" y "Quitar" — el grupo familiar y los egresos mensuales del
 * estudio socioeconómico son el caso que motivó esto, pero cualquier
 * formulario configurado con un grupo_repetible nuevo se beneficia igual.
 *
 * Este componente solo carga los datos y decide loading/error/vacío; una
 * vez que formulario y respuestas están listos, delega en FormularioInterno
 * (más abajo), que sí puede inicializar su estado en el primer render sin
 * useEffect porque para entonces los datos ya existen.
 */
function ModalFormulario({
  detalleSolicitudId,
  formularioId,
  nombreFormulario,
  abierto,
  onCerrar,
  soloLectura,
}: {
  detalleSolicitudId: number;
  formularioId: number;
  nombreFormulario: string;
  abierto: boolean;
  onCerrar: () => void;
  /** true si la línea ya no admite editarse (cancelada, o solicitud inactiva). */
  soloLectura?: boolean;
}) {
  const formulario = useQuery({
    queryKey: [CLAVE_FORMULARIOS, formularioId],
    queryFn: () => obtenerFormulario(formularioId),
  });

  const respuestasPrevias = useQuery({
    queryKey: [
      CLAVE_FORMULARIOS,
      "respuestas",
      detalleSolicitudId,
      formularioId,
    ],
    queryFn: () => obtenerRespuestas(detalleSolicitudId, formularioId),
  });

  const cargando = formulario.isPending || respuestasPrevias.isPending;
  const conError = formulario.isError || respuestasPrevias.isError;

  if (cargando || conError || !formulario.data || !respuestasPrevias.data) {
    return (
      <Modal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={nombreFormulario}
        tamano="amplio"
        pie={
          <GrupoBotones>
            <Boton variante="terciaria" onClick={onCerrar}>
              Cerrar
            </Boton>
          </GrupoBotones>
        }
      >
        {cargando ? (
          <>
            <Esqueleto ancho={280} alto={28} />
            <div style={{ marginTop: 24 }}>
              <Esqueleto alto={16} />
            </div>
          </>
        ) : (
          <EstadoVacio
            titulo="No se pudo cargar el formulario"
            texto={mensajeDeError(formulario.error ?? respuestasPrevias.error)}
            accion={
              <Boton
                variante="secundaria"
                onClick={() => {
                  void formulario.refetch();
                  void respuestasPrevias.refetch();
                }}
              >
                Reintentar
              </Boton>
            }
          />
        )}
      </Modal>
    );
  }

  return (
    <FormularioInterno
      detalleSolicitudId={detalleSolicitudId}
      formularioId={formularioId}
      nombreFormulario={nombreFormulario}
      abierto={abierto}
      onCerrar={onCerrar}
      soloLectura={soloLectura}
      formulario={formulario.data}
      respuestasPrevias={respuestasPrevias.data}
    />
  );
}

function FormularioInterno({
  detalleSolicitudId,
  formularioId,
  nombreFormulario,
  abierto,
  onCerrar,
  soloLectura,
  formulario,
  respuestasPrevias,
}: {
  detalleSolicitudId: number;
  formularioId: number;
  nombreFormulario: string;
  abierto: boolean;
  onCerrar: () => void;
  soloLectura?: boolean;
  formulario: FormularioConCampos;
  respuestasPrevias: RespuestasFormulario;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  const { sueltos: camposSueltos, grupos: camposGrupos } = useMemo(
    () => agruparCampos(formulario.campos),
    [formulario],
  );

  const [estado, setEstado] = useState<{
    sueltos: ValoresSueltos;
    grupos: ValoresGrupos;
  }>(() => estadoInicial(formulario, respuestasPrevias, camposGrupos));
  const { sueltos, grupos } = estado;
  const setSueltos = (actualizar: (previo: ValoresSueltos) => ValoresSueltos) =>
    setEstado((previo) => ({ ...previo, sueltos: actualizar(previo.sueltos) }));
  const setGrupos = (actualizar: (previo: ValoresGrupos) => ValoresGrupos) =>
    setEstado((previo) => ({ ...previo, grupos: actualizar(previo.grupos) }));
  const [tocado, setTocado] = useState(false);
  const [erroresPorCampo, setErroresPorCampo] = useState<
    Record<number, string>
  >({});

  const hayCambios =
    Object.values(sueltos).some((v) => v != null && v !== "") ||
    Object.values(grupos).some((filas) => filas.length > 0);

  const cerrar = useCierreSeguro({
    hayCambios: tocado && hayCambios,
    onCerrar,
    mensaje:
      "Hay respuestas escritas que todavía no se han guardado. Si cierra ahora, se pierden.",
  });

  const marcarSuelto = (campoId: number, valor: string | null) => {
    setTocado(true);
    setSueltos((previo) => ({ ...previo, [campoId]: valor }));
    setErroresPorCampo((previo) => {
      if (!previo[campoId]) return previo;
      const resto = { ...previo };
      delete resto[campoId];
      return resto;
    });
  };

  const marcarFilaGrupo = (
    nombreGrupo: string,
    indiceFila: number,
    campoId: number,
    valor: string | null,
  ) => {
    setTocado(true);
    setGrupos((previo) => {
      const filas = [...(previo[nombreGrupo] ?? [])];
      filas[indiceFila] = { ...filas[indiceFila], [campoId]: valor };
      return { ...previo, [nombreGrupo]: filas };
    });
  };

  const agregarFila = (nombreGrupo: string) => {
    setTocado(true);
    setGrupos((previo) => ({
      ...previo,
      [nombreGrupo]: [
        ...(previo[nombreGrupo] ?? []),
        filaVacia(camposGrupos.get(nombreGrupo) ?? []),
      ],
    }));
  };

  const quitarFila = (nombreGrupo: string, indice: number) => {
    setTocado(true);
    setGrupos((previo) => ({
      ...previo,
      [nombreGrupo]: (previo[nombreGrupo] ?? []).filter((_, i) => i !== indice),
    }));
  };

  const aplanarRespuestas = (): DatosRespuesta[] => {
    const resultado: DatosRespuesta[] = [];
    for (const campo of camposSueltos) {
      const valor = sueltos[campo.id];
      if (valor != null && valor !== "") {
        resultado.push({
          formulario_campo_id: campo.id,
          numero_fila: 1,
          valor_texto: valor,
        });
      }
    }
    for (const [nombreGrupo, filas] of Object.entries(grupos)) {
      const camposDelGrupo = camposGrupos.get(nombreGrupo) ?? [];
      filas.forEach((fila, indice) => {
        for (const campo of camposDelGrupo) {
          const valor = fila[campo.id];
          if (valor != null && valor !== "") {
            resultado.push({
              formulario_campo_id: campo.id,
              numero_fila: indice + 1,
              valor_texto: valor,
            });
          }
        }
      });
    }
    return resultado;
  };

  /** Campos sueltos obligatorios sin responder. Los de un grupo no se exigen por fila. */
  const validarObligatorios = (): boolean => {
    const errores: Record<number, string> = {};
    for (const campo of camposSueltos) {
      if (campo.obligatorio && !sueltos[campo.id]) {
        errores[campo.id] = "Este campo es obligatorio.";
      }
    }
    setErroresPorCampo(errores);
    return Object.keys(errores).length === 0;
  };

  const guardar = useMutation({
    mutationFn: (completado: boolean) =>
      guardarRespuestas(detalleSolicitudId, formularioId, {
        completado,
        respuestas: aplanarRespuestas(),
      }),
    onSuccess: async (_datos, completado) => {
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_FORMULARIOS, "lineas", detalleSolicitudId],
      });
      await clienteQuery.invalidateQueries({
        queryKey: [
          CLAVE_FORMULARIOS,
          "respuestas",
          detalleSolicitudId,
          formularioId,
        ],
      });
      avisar(
        completado
          ? "Formulario guardado como completo."
          : "Borrador guardado.",
        "exito",
      );
      onCerrar();
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={nombreFormulario}
      descripcion={formulario.descripcion ?? undefined}
      tamano="amplio"
      bloqueado={guardar.isPending}
      pie={
        soloLectura ? (
          <GrupoBotones>
            <Boton variante="terciaria" onClick={cerrar}>
              Cerrar
            </Boton>
          </GrupoBotones>
        ) : (
          <GrupoBotones>
            <Boton
              variante="terciaria"
              onClick={cerrar}
              disabled={guardar.isPending}
            >
              Cancelar
            </Boton>
            <Boton
              variante="secundaria"
              cargando={guardar.isPending && guardar.variables === false}
              textoCargando="Guardando…"
              onClick={() => guardar.mutate(false)}
            >
              Guardar borrador
            </Boton>
            <Boton
              variante="primaria"
              cargando={guardar.isPending && guardar.variables === true}
              textoCargando="Guardando…"
              onClick={() => {
                if (validarObligatorios()) guardar.mutate(true);
              }}
            >
              Guardar como completo
            </Boton>
          </GrupoBotones>
        )
      }
    >
      <div className={estilos.enModal}>
        {camposSueltos.length > 0 && (
          <div className={estilos.tarjeta}>
            <div className={estilos.rejillaCampos}>
              {camposSueltos.map((campo) => (
                <div
                  key={campo.id}
                  className={
                    campo.tipo_dato_nombre === "TEXTO_LARGO" ||
                    campo.tipo_dato_nombre === "SELECCION_MULTIPLE"
                      ? estilos.anchoCompleto
                      : undefined
                  }
                >
                  <RenderizadorCampo
                    campo={campo}
                    valor={sueltos[campo.id] ?? null}
                    onCambiar={(v) => marcarSuelto(campo.id, v)}
                    error={erroresPorCampo[campo.id]}
                    deshabilitado={soloLectura}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.from(camposGrupos.entries()).map(
          ([nombreGrupo, camposDelGrupo]) => {
            const filas = grupos[nombreGrupo] ?? [];
            return (
              <div key={nombreGrupo} className={estilos.grupoRepetible}>
                <h3 className={estilos.tituloGrupo}>
                  {tituloDeGrupo(nombreGrupo)}
                </h3>

                {filas.length === 0 ? (
                  <p className={estilos.auxiliar}>
                    Todavía no hay filas agregadas.
                  </p>
                ) : (
                  filas.map((fila, indice) => (
                    <div key={indice} className={estilos.filaGrupo}>
                      {camposDelGrupo.map((campo) => (
                        <RenderizadorCampo
                          key={campo.id}
                          campo={campo}
                          valor={fila[campo.id] ?? null}
                          onCambiar={(v) =>
                            marcarFilaGrupo(nombreGrupo, indice, campo.id, v)
                          }
                          deshabilitado={soloLectura}
                        />
                      ))}
                      {!soloLectura && (
                        <Boton
                          pequeno
                          variante="terciaria"
                          onClick={() => quitarFila(nombreGrupo, indice)}
                        >
                          Quitar
                        </Boton>
                      )}
                    </div>
                  ))
                )}

                {!soloLectura && (
                  <div className={estilos.accionGrupo}>
                    <Boton
                      pequeno
                      variante="secundaria"
                      onClick={() => agregarFila(nombreGrupo)}
                    >
                      + Agregar
                    </Boton>
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    </Modal>
  );
}

export default ModalFormulario;
