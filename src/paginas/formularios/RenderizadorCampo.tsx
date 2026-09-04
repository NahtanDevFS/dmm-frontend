import { useState } from "react";
import { calcularEdad, fechaDeHoy } from "../../lib/fechas";
import { useQuery } from "@tanstack/react-query";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import {
  CLAVE_FORMULARIOS,
  TIPO_DATO,
  listarOpcionesCampo,
  listarValoresCatalogo,
  type FormularioCampo,
} from "../../api/formularios";
import { valoresSeleccionMultiple } from "./utilFormulario";
import estilos from "./Formularios.module.css";

interface PropsRenderizadorCampo {
  /**
   * Texto calculado a partir de lo ya respondido, que se muestra debajo del
   * campo junto a su ayuda. Es una sugerencia, no un valor: quien llena
   * decide. Ver sugerencias.ts.
   */
  sugerencia?: string;
  campo: FormularioCampo;
  valor: string | null;
  onCambiar: (valor: string | null) => void;
  error?: string;
  deshabilitado?: boolean;
}

/**
 * Renderiza el control correcto según campo.tipo_dato_nombre. Las opciones
 * de SELECCION_UNICA/MULTIPLE vienen de exactamente un lugar —catalogo_id o
 * formulario_campo_opcion, nunca ambos— así que solo una de las dos
 * consultas de abajo llega a estar habilitada para un campo dado.
 */
function RenderizadorCampo({
  campo,
  valor,
  onCambiar,
  error,
  deshabilitado,
  sugerencia,
}: PropsRenderizadorCampo) {
  /**
   * Mientras el campo numérico está enfocado se edita crudo; al salir se
   * muestra con separadores de miles. No se puede formatear siempre porque
   * un <input type="number"> rechaza las comas.
   */
  const [enfocado, setEnfocado] = useState(false);
  const tieneDecimales = typeof valor === "string" && valor.includes(".");

  const esSeleccion =
    campo.tipo_dato_nombre === TIPO_DATO.SELECCION_UNICA ||
    campo.tipo_dato_nombre === TIPO_DATO.SELECCION_MULTIPLE;

  const valoresCatalogo = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "catalogo-valores", campo.catalogo_id],
    queryFn: () => listarValoresCatalogo(campo.catalogo_id!),
    enabled: esSeleccion && campo.catalogo_id != null,
  });

  const opcionesPropias = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "opciones-campo", campo.id],
    queryFn: () => listarOpcionesCampo(campo.id),
    enabled: esSeleccion && campo.catalogo_id == null,
  });

  const opciones: { id: number; etiqueta: string }[] = campo.catalogo_id
    ? (valoresCatalogo.data ?? [])
    : (opcionesPropias.data ?? []);

  /**
   * Solo cuenta la consulta que este campo realmente usa, y se mira
   * `isLoading` y no `isPending`.
   *
   * Las dos consultas están siempre declaradas pero solo una se habilita
   * según el campo tenga catálogo o no. Una consulta deshabilitada se queda
   * en `isPending` para siempre, porque nunca llega a tener datos: mirar las
   * dos dejaba el selector diciendo 'Cargando…' aunque ya hubiera cargado.
   * `isLoading` es pendiente Y en vuelo, que es lo que aquí interesa.
   */
  /**
   * La sugerencia se suma a la ayuda en vez de reemplazarla: la ayuda
   * explica cómo responder y la sugerencia dice qué sale de lo respondido.
   */
  const ayudaCampo = [campo.ayuda ?? undefined, sugerencia]
    .filter(Boolean)
    .join(" ");

  const cargandoOpciones =
    campo.catalogo_id != null
      ? valoresCatalogo.isLoading
      : opcionesPropias.isLoading;

  switch (campo.tipo_dato_nombre) {
    case TIPO_DATO.TEXTO_LARGO:
      return (
        <CampoAreaTexto
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={ayudaCampo || undefined}
          error={error}
          rows={3}
          maxLength={4000}
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        />
      );

    case TIPO_DATO.FECHA_NACIMIENTO: {
      /*
        Se captura la fecha y se muestra la edad calculada como ayuda del
        campo. El familiar del grupo familiar no está registrado como persona
        en el sistema, así que no hay ficha de la cual leerla; pero capturar
        la edad directamente registraría un número que deja de ser cierto al
        año siguiente.
      */
      const edad =
        valor && !Number.isNaN(Date.parse(valor)) ? calcularEdad(valor) : null;

      return (
        <CampoTexto
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={
            edad !== null && edad >= 0
              ? edad + (edad === 1 ? " año" : " años") + " a la fecha de hoy"
              : (campo.ayuda ?? "La edad se calcula sola.")
          }
          error={error}
          type="date"
          max={fechaDeHoy()}
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        />
      );
    }

    case TIPO_DATO.NUMERO: {
      /*
        Los montos en quetzales se capturan con este tipo, así que se permiten
        decimales y se muestra el valor con separadores de miles cuando el
        campo pierde el foco: "1250" cuesta de leer, "1,250.00" no.

        El formato solo se aplica al mostrar; lo que se guarda sigue siendo el
        número crudo. Y no se adivina cuáles campos son dinero: la "Q" la pone
        quien define el formulario en la etiqueta, como en "Monto (Q)".
      */
      const formateado =
        !enfocado && valor !== null && valor !== "" && !isNaN(Number(valor))
          ? Number(valor).toLocaleString("es-GT", {
              minimumFractionDigits: tieneDecimales ? 2 : 0,
              maximumFractionDigits: 2,
            })
          : (valor ?? "");

      return (
        <CampoTexto
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={ayudaCampo || undefined}
          error={error}
          // Mientras se edita es un campo numérico de verdad; al salir pasa a
          // texto para poder mostrar las comas, que type="number" rechaza.
          type={enfocado ? "number" : "text"}
          inputMode="decimal"
          step="any"
          numerico
          value={formateado}
          disabled={deshabilitado}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onChange={(e) => onCambiar(e.target.value || null)}
        />
      );
    }

    case TIPO_DATO.FECHA:
      return (
        <CampoTexto
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={ayudaCampo || undefined}
          error={error}
          type="date"
          max={fechaDeHoy()}
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        />
      );

    case TIPO_DATO.SI_NO:
      return (
        <CampoSelect
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={ayudaCampo || undefined}
          error={error}
          marcador="Seleccione…"
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        >
          <option value="SI">Sí</option>
          <option value="NO">No</option>
        </CampoSelect>
      );

    case TIPO_DATO.SELECCION_UNICA:
      return (
        <CampoSelect
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={ayudaCampo || undefined}
          error={error}
          marcador={cargandoOpciones ? "Cargando…" : "Seleccione…"}
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        >
          {opciones.map((opcion) => (
            <option key={opcion.id} value={opcion.etiqueta}>
              {opcion.etiqueta}
            </option>
          ))}
        </CampoSelect>
      );

    case TIPO_DATO.SELECCION_MULTIPLE: {
      const elegidos = valoresSeleccionMultiple(valor);
      return (
        <fieldset className={estilos.grupoCasillas}>
          <legend className={estilos.leyendaCasillas}>
            {campo.etiqueta}
            {campo.obligatorio && (
              <span aria-hidden="true" className={estilos.obligatorio}>
                {" "}
                *
              </span>
            )}
          </legend>
          {campo.ayuda && (
            <p className={estilos.ayudaCasillas}>{campo.ayuda}</p>
          )}
          {opciones.map((opcion) => (
            <label key={opcion.id} className={estilos.opcionCasilla}>
              <input
                type="checkbox"
                checked={elegidos.includes(opcion.etiqueta)}
                disabled={deshabilitado}
                onChange={(e) => {
                  const siguiente = e.target.checked
                    ? [...elegidos, opcion.etiqueta]
                    : elegidos.filter((v) => v !== opcion.etiqueta);
                  onCambiar(
                    siguiente.length ? JSON.stringify(siguiente) : null,
                  );
                }}
              />
              {opcion.etiqueta}
            </label>
          ))}
          {error && <p className={estilos.errorCasillas}>{error}</p>}
        </fieldset>
      );
    }

    case TIPO_DATO.TEXTO_CORTO:
    default:
      return (
        <CampoTexto
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={ayudaCampo || undefined}
          error={error}
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        />
      );
  }
}

export default RenderizadorCampo;
