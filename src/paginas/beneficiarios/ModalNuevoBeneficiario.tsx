import { useEffect, useId } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Modal from "../../componentes/ui/Modal";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { calcularEdad, esMenorDeEdad } from "../../lib/fechas";
import { errorDeCampo, mensajeDeError } from "../../lib/errores";
import { CLAVE_PERSONAS, crearPersona } from "../../api/personas";
import type { CrearPersona, EncargadoNuevo } from "../../api/personas";
import type { Comunidad, ElementoCatalogo } from "../../types/api";
import { esquemaBeneficiario, type DatosBeneficiario } from "./esquema";
import estilos from "./Formulario.module.css";

const numeroOpcional = (valor: string | undefined) =>
  valor ? Number(valor) : null;

/**
 * Arma el encargado para el API.
 *
 * El esquema deja sus campos opcionales y exige los obligatorios desde el
 * superRefine, así que aquí hay que estrechar el tipo. Si falta alguno se
 * devuelve undefined en vez de enviar a medias: la validación ya habrá
 * impedido llegar hasta aquí, y esto solo evita mandar un encargado roto si
 * alguna vez dejara de hacerlo.
 */
function armarEncargado(
  encargado: DatosBeneficiario["encargado"],
): EncargadoNuevo[] | undefined {
  if (!encargado) return undefined;
  const { nombres, apellidos, fecha_nacimiento, tipoParentescoId } = encargado;
  if (!nombres || !apellidos || !fecha_nacimiento || !tipoParentescoId) {
    return undefined;
  }
  return [
    {
      tipo: "nuevo",
      tipoParentescoId: Number(tipoParentescoId),
      datos: {
        nombres,
        apellidos,
        fecha_nacimiento,
        cui_dpi: encargado.cui_dpi || null,
        telefono: encargado.telefono || null,
      },
    },
  ];
}

/**
 * Registro de un beneficiario.
 *
 * Va en modal y no en pantalla propia porque el alta nace siempre desde el
 * listado y vuelve a él: sacar al usuario de la tabla para traerlo de vuelta
 * dos pantallas después le hacía perder el filtro y la página en la que
 * estaba. El formulario es largo, pero el modal deja fijos el encabezado y el
 * pie, así que las acciones no se pierden al desplazarse.
 *
 * El botón de guardar vive en el pie, que en el DOM es hermano del cuerpo y no
 * está dentro del <form>. Por eso lleva `form={idFormulario}`: es lo que
 * permite que un submit fuera del formulario siga siendo su submit, con la
 * validación nativa y el Enter incluidos.
 */
function ModalNuevoBeneficiario({
  abierto,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  /** Recibe el id recién creado para que el listado abra su ficha. */
  onCreado: (personaId: number) => void;
}) {
  const idFormulario = useId();
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  const generos = useCatalogo<ElementoCatalogo>("tipos-genero");
  const comunidades = useCatalogo<Comunidad>("comunidades");
  const discapacidades = useCatalogo<ElementoCatalogo>("discapacidades");
  const parentescos = useCatalogo<ElementoCatalogo>("tipos-parentesco");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<DatosBeneficiario>({
    // El esquema valida y transforma, así que su tipo de salida no coincide
    // con el de los campos del formulario. El cast se limita a esta línea.
    resolver: zodResolver(esquemaBeneficiario) as Resolver<DatosBeneficiario>,
    defaultValues: {
      cui_dpi: "",
      nombres: "",
      apellidos: "",
      fecha_nacimiento: "",
      genero_id: "",
      comunidad_id: "",
      telefono: "",
      discapacidadIds: [],
      contactos: [],
    },
  });

  const contactos = useFieldArray({ control, name: "contactos" });

  /*
   * useWatch y no watch(): watch() devuelve una función que el compilador de
   * React no puede memoizar, y avisa de que el valor podría quedarse obsoleto
   * si se pasa a un componente memoizado. useWatch se suscribe al campo y
   * devuelve el valor.
   */
  const fechaNacimiento = useWatch({ control, name: "fecha_nacimiento" });
  const cui = useWatch({ control, name: "cui_dpi" });
  const edad = fechaNacimiento ? calcularEdad(fechaNacimiento) : Number.NaN;
  const menor = Boolean(fechaNacimiento) && esMenorDeEdad(fechaNacimiento);
  /**
   * Un menor sin CUI/DPI no puede guardarse sin encargado: lo rechaza un
   * constraint diferido de la base al confirmar la transacción. Se avisa antes
   * de que el formulario esté lleno.
   */
  const encargadoObligatorio = menor && !cui;

  useEffect(() => setFocus("cui_dpi"), [setFocus]);

  // Al dejar de ser menor, el bloque de encargado se descarta: si se
  // conservara oculto, se enviarían datos que el usuario ya no ve.
  useEffect(() => {
    if (!menor) setValue("encargado", undefined);
  }, [menor, setValue]);

  const mutacion = useMutation({
    mutationFn: crearPersona,
    onSuccess: async (persona) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_PERSONAS] });
      avisar("Beneficiario registrado.", "exito");
      // El listado cierra este modal y abre la ficha del recién creado: es lo
      // que se quiere ver después de registrar a alguien.
      onCreado(persona.id);
    },
  });

  const enviar = handleSubmit(async (datos) => {
    /**
     * Se envía todo en una sola llamada: el backend crea persona,
     * discapacidades, encargados y contactos en la misma transacción. Hacerlo
     * en varias peticiones dejaría una persona a medias si una fallara.
     */
    const cuerpo: CrearPersona = {
      cui_dpi: datos.cui_dpi || null,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      fecha_nacimiento: datos.fecha_nacimiento,
      genero_id: numeroOpcional(datos.genero_id),
      comunidad_id: numeroOpcional(datos.comunidad_id),
      telefono: datos.telefono || null,
      discapacidadIds: datos.discapacidadIds ?? [],
      contactos: (datos.contactos ?? []).map((contacto) => ({
        nombre: contacto.nombre,
        telefono: contacto.telefono || null,
        observaciones: contacto.observaciones || null,
      })),
      encargados: armarEncargado(datos.encargado),
    };

    try {
      await mutacion.mutateAsync(cuerpo);
    } catch (error) {
      // El backend devuelve el detalle por campo en las validaciones, y los
      // triggers de la base mandan su propio mensaje en 400 o 409.
      const porCampo = errorDeCampo(error, "cui_dpi");
      if (porCampo) setError("cui_dpi", { message: porCampo });
      setError("root", { message: mensajeDeError(error) });
    }
  });

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar nuevo beneficiario"
      descripcion="Los documentos de identificación se adjuntan después, desde la ficha."
      tamano="amplio"
      // Cerrar a media escritura perdería el formulario entero sin avisar.
      bloqueado={isSubmitting}
      pie={
        <GrupoBotones>
          <Boton variante="terciaria" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </Boton>
          <Boton
            type="submit"
            form={idFormulario}
            variante="primaria"
            cargando={isSubmitting}
            textoCargando="Guardando…"
          >
            Guardar beneficiario
          </Boton>
        </GrupoBotones>
      }
    >
      <form
        id={idFormulario}
        className={estilos.formulario + " " + estilos.enModal}
        onSubmit={enviar}
        noValidate
      >
        {/* ─────────────── Datos generales ─────────────── */}
        <section className={estilos.seccion} aria-labelledby="s-generales">
          <h2 id="s-generales" className={estilos.tituloSeccion}>
            Datos generales
          </h2>
          <p className={estilos.descripcionSeccion}>
            El CUI/DPI es opcional: los menores suelen no tenerlo todavía.
          </p>

          <div className={estilos.rejilla}>
            <CampoTexto
              etiqueta="CUI / DPI"
              identificador
              inputMode="numeric"
              maxLength={13}
              placeholder="1234567890101"
              ayuda="13 dígitos, sin espacios."
              error={errors.cui_dpi?.message}
              {...register("cui_dpi")}
            />
            <CampoTexto
              etiqueta="Teléfono de contacto"
              type="tel"
              placeholder="5555-4444"
              error={errors.telefono?.message}
              {...register("telefono")}
            />
            <CampoTexto
              etiqueta="Nombres"
              obligatorio
              error={errors.nombres?.message}
              {...register("nombres")}
            />
            <CampoTexto
              etiqueta="Apellidos"
              obligatorio
              error={errors.apellidos?.message}
              {...register("apellidos")}
            />

            <div className={estilos.par}>
              <CampoTexto
                etiqueta="Fecha de nacimiento"
                type="date"
                obligatorio
                error={errors.fecha_nacimiento?.message}
                {...register("fecha_nacimiento")}
              />
              <CampoTexto
                etiqueta="Edad"
                calculado
                numerico
                value={Number.isFinite(edad) ? String(edad) : ""}
                readOnly
                ayuda="Se calcula sola."
              />
            </div>

            <CampoSelect
              etiqueta="Género"
              error={errors.genero_id?.message}
              {...register("genero_id")}
            >
              {generos.opciones.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoSelect
              etiqueta="Comunidad"
              error={errors.comunidad_id?.message}
              {...register("comunidad_id")}
            >
              {comunidades.opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </CampoSelect>
          </div>
        </section>

        {/* ─────────────── Discapacidades ─────────────── */}
        <section className={estilos.seccion} aria-labelledby="s-discapacidades">
          <h2 id="s-discapacidades" className={estilos.tituloSeccion}>
            Discapacidades
          </h2>
          <p className={estilos.descripcionSeccion}>
            Opcional. Seleccione todas las que apliquen según evaluación. Es
            información de salud: no aparecerá en el listado general.
          </p>

          <Controller
            control={control}
            name="discapacidadIds"
            render={({ field }) => (
              <div className={estilos.casillas}>
                {discapacidades.opciones.map((d) => {
                  const marcadas = field.value ?? [];
                  const activa = marcadas.includes(d.id);
                  return (
                    <label key={d.id} className={estilos.casillaEtiqueta}>
                      <input
                        type="checkbox"
                        className={estilos.casilla}
                        checked={activa}
                        onChange={(e) =>
                          field.onChange(
                            e.target.checked
                              ? [...marcadas, d.id]
                              : marcadas.filter((id) => id !== d.id),
                          )
                        }
                      />
                      {d.nombre}
                    </label>
                  );
                })}
              </div>
            )}
          />
        </section>

        {/* ─────────────── Encargado ─────────────── */}
        <section
          className={
            estilos.seccion + (menor ? "" : " " + estilos.seccionInactiva)
          }
          aria-labelledby="s-encargado"
        >
          <h2 id="s-encargado" className={estilos.tituloSeccion}>
            Encargado
          </h2>

          {!fechaNacimiento ? (
            <p className={estilos.descripcionSeccion}>
              Se habilita al indicar una fecha de nacimiento de menos de 18
              años.
            </p>
          ) : !menor ? (
            <p className={estilos.descripcionSeccion}>
              No aplica: el beneficiario tiene {edad} años.
            </p>
          ) : (
            <p
              className={
                estilos.avisoEncargado +
                (encargadoObligatorio ? " " + estilos.avisoBloqueante : "")
              }
            >
              {encargadoObligatorio
                ? "El beneficiario tiene " +
                  edad +
                  " años y no se registró CUI/DPI, así que el encargado es obligatorio: la base de datos rechazará el registro sin él."
                : "El beneficiario tiene " +
                  edad +
                  " años. Puede registrar un encargado."}
            </p>
          )}

          {menor && (
            <div className={estilos.rejilla}>
              <CampoTexto
                etiqueta="Nombres del encargado"
                obligatorio={encargadoObligatorio}
                error={errors.encargado?.nombres?.message}
                {...register("encargado.nombres")}
              />
              <CampoTexto
                etiqueta="Apellidos del encargado"
                obligatorio={encargadoObligatorio}
                error={errors.encargado?.apellidos?.message}
                {...register("encargado.apellidos")}
              />
              <CampoTexto
                etiqueta="CUI / DPI del encargado"
                identificador
                maxLength={13}
                error={errors.encargado?.cui_dpi?.message}
                {...register("encargado.cui_dpi")}
              />
              <CampoTexto
                etiqueta="Fecha de nacimiento del encargado"
                type="date"
                obligatorio={encargadoObligatorio}
                error={errors.encargado?.fecha_nacimiento?.message}
                {...register("encargado.fecha_nacimiento")}
              />
              <CampoTexto
                etiqueta="Teléfono del encargado"
                type="tel"
                error={errors.encargado?.telefono?.message}
                {...register("encargado.telefono")}
              />
              <CampoSelect
                etiqueta="Parentesco"
                obligatorio={encargadoObligatorio}
                error={errors.encargado?.tipoParentescoId?.message}
                {...register("encargado.tipoParentescoId")}
              >
                {parentescos.opciones.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </CampoSelect>
            </div>
          )}

          {errors.encargado?.message && (
            <p className={estilos.errorGeneral} role="alert">
              {errors.encargado.message}
            </p>
          )}
        </section>

        {/* ─────────────── Contactos de referencia ─────────────── */}
        <section className={estilos.seccion} aria-labelledby="s-contactos">
          <h2 id="s-contactos" className={estilos.tituloSeccion}>
            Contactos de referencia
          </h2>
          <p className={estilos.descripcionSeccion}>
            Opcional. Personas a quienes acudir si no se localiza al
            beneficiario.
          </p>

          {contactos.fields.map((campo, indice) => (
            <div key={campo.id} className={estilos.contacto}>
              <CampoTexto
                etiqueta="Nombre"
                obligatorio
                error={errors.contactos?.[indice]?.nombre?.message}
                {...register(`contactos.${indice}.nombre`)}
              />
              <CampoTexto
                etiqueta="Teléfono"
                type="tel"
                {...register(`contactos.${indice}.telefono`)}
              />
              <CampoAreaTexto
                etiqueta="Observaciones"
                {...register(`contactos.${indice}.observaciones`)}
              />
              <Boton
                variante="terciaria"
                pequeno
                onClick={() => contactos.remove(indice)}
              >
                Quitar contacto
              </Boton>
            </div>
          ))}

          <div style={{ marginTop: "var(--space-2)" }}>
            <Boton
              variante="secundaria"
              onClick={() =>
                contactos.append({ nombre: "", telefono: "", observaciones: "" })
              }
            >
              Agregar contacto
            </Boton>
          </div>
        </section>

        {errors.root?.message && (
          <p className={estilos.errorGeneral} role="alert">
            {errors.root.message}
          </p>
        )}

      </form>
    </Modal>
  );
}

export default ModalNuevoBeneficiario;
