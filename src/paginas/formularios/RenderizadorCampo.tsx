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
import { fechaDeHoy } from "../../lib/fechas";
import { valoresSeleccionMultiple } from "./utilFormulario";
import estilos from "./Formularios.module.css";

interface PropsRenderizadorCampo {
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
}: PropsRenderizadorCampo) {
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

  switch (campo.tipo_dato_nombre) {
    case TIPO_DATO.TEXTO_LARGO:
      return (
        <CampoAreaTexto
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={campo.ayuda ?? undefined}
          error={error}
          rows={3}
          maxLength={4000}
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        />
      );

    case TIPO_DATO.NUMERO:
      return (
        <CampoTexto
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={campo.ayuda ?? undefined}
          error={error}
          type="number"
          numerico
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        />
      );

    case TIPO_DATO.FECHA:
      return (
        <CampoTexto
          etiqueta={campo.etiqueta}
          obligatorio={campo.obligatorio}
          ayuda={campo.ayuda ?? undefined}
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
          ayuda={campo.ayuda ?? undefined}
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
          ayuda={campo.ayuda ?? undefined}
          error={error}
          marcador={
            valoresCatalogo.isPending || opcionesPropias.isPending
              ? "Cargando…"
              : "Seleccione…"
          }
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
          ayuda={campo.ayuda ?? undefined}
          error={error}
          value={valor ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambiar(e.target.value || null)}
        />
      );
  }
}

export default RenderizadorCampo;
