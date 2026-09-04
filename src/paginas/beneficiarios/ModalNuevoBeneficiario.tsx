import { useEffect, useId } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
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
import type { ElementoCatalogo } from "../../types/api";
import { esquemaBeneficiario, type DatosBeneficiario } from "./esquema";
import SelectorComunidad from "./SelectorComunidad";
import SelectorMunicipio from "./SelectorMunicipio";
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
  const estadosCiviles = useCatalogo<ElementoCatalogo>("estados-civiles");
  const gradosAcademicos = useCatalogo<ElementoCatalogo>("grados-academicos");
  const ocupaciones = useCatalogo<ElementoCatalogo>("ocupaciones");
  const discapacidades = useCatalogo<ElementoCatalogo>("discapacidades");
  const parentescos = useCatalogo<ElementoCatalogo>("tipos-parentesco");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    formState: { errors, isSubmitting, isDirty },
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

  /*
    isDirty lo lleva react-hook-form comparando contra los valores por defecto,
    así que no hay que rastrear a mano treinta campos repartidos en cuatro
    secciones. Es además el formulario más largo del sistema: perderlo por un
    clic fuera del modal es exactamente lo que este aviso evita.
  */
  const cerrar = useCierreSeguro({
    hayCambios: isDirty,
    onCerrar,
    mensaje:
      "Este registro tiene datos escritos que todavía no se han guardado. Si cierra ahora, se pierde todo el formulario.",
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
  const discapacidadesElegidas = useWatch({
    control,
    name: "discapacidadIds",
  });

  /**
   * A quién CONVIENE registrarle un encargado: menores de edad y personas con
   * alguna discapacidad. Es una recomendación, nunca un bloqueo — la base
   * dejó de exigirlo en la migración 22. Negarse a registrar a alguien por un
   * dato que no trae encima no protege a nadie: en la práctica se termina
   * inventando el dato, o la persona no queda registrada y su ayuda tampoco.
   */
  const encargadoRecomendado =
    menor || (discapacidadesElegidas?.length ?? 0) > 0;

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
      estado_civil_id: numeroOpcional(datos.estado_civil_id),
      grado_academico_id: numeroOpcional(datos.grado_academico_id),
      ocupacion_id: numeroOpcional(datos.ocupacion_id),
      municipio_nacimiento_id: numeroOpcional(datos.municipio_nacimiento_id),
      direccion: datos.direccion || null,
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
      onCerrar={cerrar}
      titulo="Registrar nuevo beneficiario"
      descripcion="Los documentos de identificación se adjuntan después, desde la ficha."
      tamano="amplio"
      // Cerrar a media escritura perdería el formulario entero sin avisar.
      bloqueado={isSubmitting}
      pie={
        <GrupoBotones>
          <Boton variante="terciaria" onClick={cerrar} disabled={isSubmitting}>
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
              placeholder="5512 3344"
              ayuda="8 dígitos."
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

            {/*
              Tres selectores encadenados en lugar de un desplegable plano de
              comunidades. Solo se guarda la comunidad —la persona no tiene
              municipio ni departamento propios, cuelgan de ella—, pero sin
              acotar por municipio la lista se vuelve inmanejable en cuanto el
              catálogo crece.
            */}
            <Controller
              control={control}
              name="comunidad_id"
              render={({ field }) => (
                <SelectorComunidad
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={errors.comunidad_id?.message}
                />
              )}
            />

            {/*
              Lo que pide la sección I del estudio socioeconómico y que antes
              no se guardaba: así el formulario no tiene que volver a
              preguntarlo y queda una sola versión del dato.
            */}
            <CampoSelect
              etiqueta="Estado civil"
              error={errors.estado_civil_id?.message}
              {...register("estado_civil_id")}
            >
              {estadosCiviles.opciones.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoSelect
              etiqueta="Grado académico"
              error={errors.grado_academico_id?.message}
              {...register("grado_academico_id")}
              ayuda="«Ninguno» es distinto de dejarlo vacío: uno dice que no estudió, el otro que no se preguntó."
            >
              {gradosAcademicos.opciones.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoSelect
              etiqueta="Ocupación"
              error={errors.ocupacion_id?.message}
              {...register("ocupacion_id")}
            >
              {ocupaciones.opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoTexto
              etiqueta="Dirección de vivienda"
              maxLength={255}
              error={errors.direccion?.message}
              {...register("direccion")}
            />

            {/* Dónde nació, que puede no ser donde vive. Solo se guarda el
                municipio: el departamento ya cuelga de él. */}
            <Controller
              control={control}
              name="municipio_nacimiento_id"
              render={({ field }) => (
                <SelectorMunicipio
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
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
        <section className={estilos.seccion} aria-labelledby="s-encargado">
          <h2 id="s-encargado" className={estilos.tituloSeccion}>
            Encargado
          </h2>

          {/* Siempre disponible: cualquier persona puede tener a alguien que
              responda por ella. Lo que cambia es el énfasis del aviso. */}
          {encargadoRecomendado ? (
            <p className={estilos.avisoEncargado}>
              {menor
                ? "El beneficiario tiene " +
                  edad +
                  " años. Conviene registrar un encargado" +
                  (cui ? "." : ", sobre todo porque no tiene CUI/DPI.")
                : "El beneficiario tiene una discapacidad registrada. Conviene anotar quién responde por él."}{" "}
              No es obligatorio: puede guardarse sin él y agregarlo después.
            </p>
          ) : (
            <p className={estilos.descripcionSeccion}>
              Opcional. Regístrelo si alguien más responde por esta persona.
            </p>
          )}

          {
            <div className={estilos.rejilla}>
              <CampoTexto
                etiqueta="Nombres del encargado"
                obligatorio={false}
                error={errors.encargado?.nombres?.message}
                {...register("encargado.nombres")}
              />
              <CampoTexto
                etiqueta="Apellidos del encargado"
                obligatorio={false}
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
                obligatorio={false}
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
                obligatorio={false}
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
          }

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
                obligatorio
                type="tel"
                placeholder="5512 3344"
                ayuda="8 dígitos."
                error={errors.contactos?.[indice]?.telefono?.message}
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
                contactos.append({
                  nombre: "",
                  telefono: "",
                  observaciones: "",
                })
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
