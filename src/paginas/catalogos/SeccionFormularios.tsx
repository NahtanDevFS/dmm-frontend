import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, { CeldaAcciones } from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_FORMULARIOS,
  CLAVE_CATALOGOS_FORMULARIO,
  listarFormularios,
  obtenerFormulario,
  crearFormulario,
  editarFormulario,
  agregarCampoFormulario,
  editarCampoFormulario,
  listarTiposDato,
  listarCatalogosFormulario,
  TIPO_DATO,
  type Formulario,
} from "../../api/formularios";
import estilos from "./Catalogos.module.css";

/** Tipos de campo que ofrecen opciones y por tanto necesitan de dónde sacarlas. */
const TIPOS_CON_OPCIONES: string[] = [
  TIPO_DATO.SELECCION_UNICA,
  TIPO_DATO.SELECCION_MULTIPLE,
];

/** Cómo se lee cada tipo de dato, en vez de su nombre técnico. */
const NOMBRE_TIPO: Record<string, string> = {
  TEXTO_CORTO: "Texto corto",
  TEXTO_LARGO: "Texto largo",
  NUMERO: "Número",
  FECHA: "Fecha",
  FECHA_NACIMIENTO: "Fecha de nacimiento (muestra la edad)",
  SI_NO: "Sí / No",
  SELECCION_UNICA: "Selección única",
  SELECCION_MULTIPLE: "Selección múltiple",
};

/**
 * Administración de formularios y de sus campos.
 *
 * Hasta ahora un formulario nuevo se creaba insertando filas por SQL a mano,
 * siguiendo la migración 17 como plantilla. Eso ataba cualquier cambio a
 * alguien con acceso a la base, cuando en realidad es una decisión de la
 * Dirección: qué se le pregunta a una persona antes de entregarle un equipo.
 *
 * Aquí se define QUÉ campos tiene cada formulario. A qué categoría de insumo
 * se le exige, y bajo qué modalidad, se decide en la pestaña de al lado.
 *
 * Los campos no se borran, se desactivan: un campo eliminado dejaría
 * huérfanas las respuestas que ya se dieron en solicitudes anteriores, y esas
 * respuestas son el respaldo de decisiones que ya se tomaron.
 */
function SeccionFormularios() {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [descripcionNueva, setDescripcionNueva] = useState("");

  // Campo en construcción.
  const [etiqueta, setEtiqueta] = useState("");
  const [tipoDatoId, setTipoDatoId] = useState("");
  const [catalogoId, setCatalogoId] = useState("");
  const [opcionesPropias, setOpcionesPropias] = useState("");
  const [obligatorio, setObligatorio] = useState(false);
  const [grupoRepetible, setGrupoRepetible] = useState("");
  const [ayuda, setAyuda] = useState("");

  const formularios = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "lista"],
    queryFn: listarFormularios,
  });

  const detalle = useQuery({
    queryKey: [CLAVE_FORMULARIOS, seleccionado],
    queryFn: () => obtenerFormulario(seleccionado!),
    enabled: seleccionado !== null,
  });

  const tiposDato = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "tipos-dato"],
    queryFn: listarTiposDato,
  });

  const catalogos = useQuery({
    queryKey: [CLAVE_CATALOGOS_FORMULARIO],
    queryFn: listarCatalogosFormulario,
  });

  const refrescar = () =>
    clienteQuery.invalidateQueries({ queryKey: [CLAVE_FORMULARIOS] });

  const tipoElegido = tiposDato.data?.find(
    (t) => t.id === Number(tipoDatoId),
  )?.nombre;
  const necesitaOpciones =
    tipoElegido !== undefined && TIPOS_CON_OPCIONES.includes(tipoElegido);

  const alta = useMutation({
    mutationFn: () =>
      crearFormulario({
        nombre: nombreNuevo.trim(),
        descripcion: descripcionNueva.trim() || null,
      }),
    onSuccess: async (creado) => {
      await refrescar();
      avisar("Formulario creado. Ahora agréguele sus campos.", "exito");
      setNombreNuevo("");
      setDescripcionNueva("");
      setSeleccionado(creado.id);
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cambioEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      editarFormulario(id, { activo }),
    onSuccess: async (_d, { activo }) => {
      await refrescar();
      avisar(
        activo
          ? "Formulario reactivado."
          : "Formulario desactivado. Deja de exigirse en las solicitudes nuevas.",
        "exito",
      );
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const nuevoCampo = useMutation({
    mutationFn: () => {
      const opciones = opcionesPropias
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);

      return agregarCampoFormulario(seleccionado!, {
        etiqueta: etiqueta.trim(),
        tipo_dato_id: Number(tipoDatoId),
        catalogo_id: catalogoId ? Number(catalogoId) : null,
        opciones_propias: catalogoId ? undefined : opciones,
        obligatorio,
        // El siguiente lugar libre. El orden importa al llenar y no tiene
        // sentido pedírselo a quien está definiendo el formulario: los campos
        // se agregan en el orden en que se quieren leer.
        orden: (detalle.data?.campos.length ?? 0) + 1,
        grupo_repetible: grupoRepetible.trim() || null,
        ayuda: ayuda.trim() || null,
      });
    },
    onSuccess: async () => {
      await refrescar();
      avisar("Campo agregado.", "exito");
      setEtiqueta("");
      setTipoDatoId("");
      setCatalogoId("");
      setOpcionesPropias("");
      setObligatorio(false);
      setGrupoRepetible("");
      setAyuda("");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cambioCampo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      editarCampoFormulario(id, { activo }),
    onSuccess: async () => {
      await refrescar();
      avisar("Campo actualizado.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const listoParaCampo =
    seleccionado !== null &&
    etiqueta.trim() !== "" &&
    tipoDatoId !== "" &&
    // Un campo de selección sin opciones no se puede contestar.
    (!necesitaOpciones || catalogoId !== "" || opcionesPropias.trim() !== "");

  const formularioActual: Formulario | undefined = formularios.data?.find(
    (f) => f.id === seleccionado,
  );

  return (
    <>
      <section className={estilos.tarjeta}>
        <div className={estilos.tituloTarjeta}>
          <h2>Formularios</h2>
        </div>
        <p className={estilos.nota}>
          Qué se le pregunta a una persona antes de entregarle un insumo. A qué
          categoría se le exige cada uno se decide en «Formularios por
          categoría».
        </p>

        {formularios.isPending ? (
          <EsqueletoTabla />
        ) : formularios.data && formularios.data.length > 0 ? (
          <Tabla titulo="Formularios definidos">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {formularios.data.map((formulario) => (
                <tr key={formulario.id}>
                  <td>{formulario.nombre}</td>
                  <td>{formulario.descripcion ?? "—"}</td>
                  <td>
                    {formulario.activo ? (
                      <Insignia tono="aprobada">Activo</Insignia>
                    ) : (
                      <Insignia tono="neutra">Inactivo</Insignia>
                    )}
                  </td>
                  <CeldaAcciones>
                    <Boton
                      pequeno
                      variante="secundaria"
                      onClick={() =>
                        setSeleccionado(
                          seleccionado === formulario.id ? null : formulario.id,
                        )
                      }
                    >
                      {seleccionado === formulario.id
                        ? "Ocultar campos"
                        : "Ver campos"}
                    </Boton>
                    <Boton
                      pequeno
                      variante="terciaria"
                      onClick={async () => {
                        if (formulario.activo) {
                          const ok = await confirmar({
                            titulo: "Desactivar formulario",
                            mensaje:
                              "«" +
                              formulario.nombre +
                              "» dejará de exigirse en las solicitudes nuevas. Las que ya lo tienen conservan lo llenado.",
                            textoConfirmar: "Desactivar",
                            destructiva: true,
                          });
                          if (!ok) return;
                        }
                        cambioEstado.mutate({
                          id: formulario.id,
                          activo: !formulario.activo,
                        });
                      }}
                    >
                      {formulario.activo ? "Desactivar" : "Reactivar"}
                    </Boton>
                  </CeldaAcciones>
                </tr>
              ))}
            </tbody>
          </Tabla>
        ) : (
          <EstadoVacio
            titulo="Sin formularios"
            texto="No hay ninguno definido todavía. Cree el primero abajo."
          />
        )}

        <div className={estilos.formulario}>
          <CampoTexto
            etiqueta="Nombre del formulario nuevo"
            obligatorio
            maxLength={150}
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
          />
          <CampoTexto
            etiqueta="Descripción"
            maxLength={2000}
            value={descripcionNueva}
            onChange={(e) => setDescripcionNueva(e.target.value)}
          />
        </div>
        <Boton
          variante="secundaria"
          disabled={nombreNuevo.trim() === ""}
          cargando={alta.isPending}
          textoCargando="Creando…"
          onClick={() => alta.mutate()}
        >
          Crear formulario
        </Boton>
      </section>

      {seleccionado !== null && (
        <section className={estilos.tarjeta}>
          <div className={estilos.tituloTarjeta}>
            <h2>Campos de «{formularioActual?.nombre}»</h2>
          </div>
          <p className={estilos.nota}>
            Se llenan en este orden. Los campos no se borran: se desactivan,
            porque borrarlos dejaría huérfanas las respuestas que ya se dieron
            en solicitudes anteriores.
          </p>

          {detalle.isPending ? (
            <EsqueletoTabla />
          ) : detalle.data && detalle.data.campos.length > 0 ? (
            <Tabla titulo="Campos del formulario">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Etiqueta</th>
                  <th>Tipo</th>
                  <th>Obligatorio</th>
                  <th>Grupo repetible</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {detalle.data.campos.map((campo) => (
                  <tr key={campo.id}>
                    <td>{campo.orden}</td>
                    <td>{campo.etiqueta}</td>
                    <td>
                      {NOMBRE_TIPO[campo.tipo_dato_nombre] ??
                        campo.tipo_dato_nombre}
                    </td>
                    <td>{campo.obligatorio ? "Sí" : "No"}</td>
                    <td>{campo.grupo_repetible ?? "—"}</td>
                    <td>
                      {campo.activo ? (
                        <Insignia tono="aprobada">Activo</Insignia>
                      ) : (
                        <Insignia tono="neutra">Inactivo</Insignia>
                      )}
                    </td>
                    <CeldaAcciones>
                      <Boton
                        pequeno
                        variante="terciaria"
                        onClick={() =>
                          cambioCampo.mutate({
                            id: campo.id,
                            activo: !campo.activo,
                          })
                        }
                      >
                        {campo.activo ? "Desactivar" : "Reactivar"}
                      </Boton>
                    </CeldaAcciones>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          ) : (
            <EstadoVacio
              titulo="Sin campos"
              texto="Este formulario todavía no pregunta nada. Agregue el primero abajo."
            />
          )}

          <div className={estilos.formulario}>
            <CampoTexto
              etiqueta="Etiqueta del campo"
              obligatorio
              maxLength={200}
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              ayuda="La pregunta tal como la va a leer quien lo llene."
            />

            <CampoSelect
              etiqueta="Tipo de dato"
              obligatorio
              value={tipoDatoId}
              onChange={(e) => {
                setTipoDatoId(e.target.value);
                setCatalogoId("");
                setOpcionesPropias("");
              }}
            >
              {tiposDato.data?.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {NOMBRE_TIPO[tipo.nombre] ?? tipo.nombre}
                </option>
              ))}
            </CampoSelect>

            {/* Solo los tipos de selección necesitan de dónde sacar opciones,
                y admiten un mecanismo o el otro, nunca los dos. */}
            {necesitaOpciones && (
              <>
                <CampoSelect
                  etiqueta="Opciones desde un catálogo"
                  value={catalogoId}
                  onChange={(e) => {
                    setCatalogoId(e.target.value);
                    if (e.target.value) setOpcionesPropias("");
                  }}
                  ayuda="Úselo cuando la lista se reutiliza en varios formularios."
                >
                  {catalogos.data?.map((catalogo) => (
                    <option key={catalogo.id} value={catalogo.id}>
                      {catalogo.nombre}
                    </option>
                  ))}
                </CampoSelect>

                <CampoAreaTexto
                  etiqueta="U opciones propias de este campo"
                  rows={4}
                  value={opcionesPropias}
                  onChange={(e) => setOpcionesPropias(e.target.value)}
                  disabled={catalogoId !== ""}
                  ayuda="Una por línea. Se ignora si eligió un catálogo arriba."
                />
              </>
            )}

            <CampoTexto
              etiqueta="Grupo repetible"
              maxLength={100}
              value={grupoRepetible}
              onChange={(e) => setGrupoRepetible(e.target.value)}
              ayuda="Deje en blanco salvo que el campo se repita en filas, como los integrantes de un hogar. Los campos con el mismo texto aquí se agrupan en la misma tabla."
            />

            <CampoTexto
              etiqueta="Ayuda para quien lo llena"
              maxLength={2000}
              value={ayuda}
              onChange={(e) => setAyuda(e.target.value)}
            />
          </div>

          <label className={estilos.opciones}>
            <input
              type="checkbox"
              className={estilos.casilla}
              checked={obligatorio}
              onChange={(e) => setObligatorio(e.target.checked)}
            />
            Obligatorio — sin él, el formulario no se puede dar por completado
          </label>

          <Boton
            variante="secundaria"
            disabled={!listoParaCampo}
            cargando={nuevoCampo.isPending}
            textoCargando="Agregando…"
            onClick={() => nuevoCampo.mutate()}
          >
            Agregar campo
          </Boton>
        </section>
      )}
    </>
  );
}

export default SeccionFormularios;
